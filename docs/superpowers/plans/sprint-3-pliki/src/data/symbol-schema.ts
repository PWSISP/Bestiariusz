import { z } from 'zod';
import type {
  CreatureEffectDef,
  ElementDef,
  FormDef,
  SymbolData,
  TraitDef,
} from '../core/types.ts';

const ROOT_PATH = '(root)';

export interface SymbolDataIssue {
  fieldPath: string;
  detail: string;
}

export class SymbolDataError extends Error {
  readonly source: string;
  /** Path of the first issue, e.g. "elements[1].cost"; "(root)" for the document itself. */
  readonly fieldPath: string;
  readonly issues: readonly SymbolDataIssue[];

  constructor(source: string, issues: readonly SymbolDataIssue[]) {
    const first = issues[0] ?? { fieldPath: ROOT_PATH, detail: 'invalid data' };
    super(`${source}: ${first.fieldPath} — ${first.detail}`);
    this.name = 'SymbolDataError';
    this.source = source;
    this.fieldPath = first.fieldPath;
    this.issues = issues;
  }
}

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'must match ^[a-z][a-z0-9_]*$');
const cost = z.number().int().min(1);
const modifier = z.number().int();

const effectSchema = z
  .object({
    trigger: z.enum(['summon', 'attack', 'damaged', 'turnEnd']),
    op: z.enum(['strike', 'guard', 'mend', 'draw', 'kindle', 'growAttack', 'growHealth', 'regen']),
    amount: z.number().int().min(1),
    scope: z.enum(['self', 'sameElementOthers', 'sameElementAll', 'othersAny']),
    pierce: z.boolean().optional(),
  })
  .strict()
  .superRefine((fx, ctx) => {
    if (fx.pierce !== undefined && fx.op !== 'strike') {
      ctx.addIssue({ code: 'custom', message: '"pierce" is only valid for op "strike"', path: ['pierce'] });
    }
  }) satisfies z.ZodType<CreatureEffectDef>;
const effects = z.array(effectSchema).optional();

const elementSchema = z
  .object({ id, cost, attackBonus: modifier, healthBonus: modifier, effects })
  .strict() satisfies z.ZodType<ElementDef>;

const formSchema = z
  .object({
    id,
    cost,
    baseAttack: z.number().int().min(0),
    baseHealth: z.number().int().min(1),
    gender: z.enum(['m', 'f']),
    effects,
  })
  .strict() satisfies z.ZodType<FormDef>;

const traitSchema = z
  .object({ id, cost, attackMod: modifier, healthMod: modifier, effects })
  .strict() satisfies z.ZodType<TraitDef>;

function uniqueIds<T extends z.ZodType<{ id: string }>>(item: T) {
  return z
    .array(item)
    .min(1)
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      items.forEach((entry, index) => {
        if (seen.has(entry.id)) {
          ctx.addIssue({
            code: 'custom',
            message: `duplicate id "${entry.id}"`,
            path: [index, 'id'],
          });
        }
        seen.add(entry.id);
      });
    });
}

const symbolDataSchema = z
  .object({
    elements: uniqueIds(elementSchema),
    forms: uniqueIds(formSchema),
    traits: uniqueIds(traitSchema),
  })
  .strict() satisfies z.ZodType<SymbolData>;

function formatPath(path: readonly PropertyKey[]): string {
  let out = '';
  for (const key of path) {
    out += typeof key === 'number' ? `[${key}]` : `${out ? '.' : ''}${String(key)}`;
  }
  return out || ROOT_PATH;
}

/** Validates raw symbol data (e.g. parsed JSON). Throws SymbolDataError with the failing field path. */
export function parseSymbolData(raw: unknown, source = 'symbols'): SymbolData {
  const result = symbolDataSchema.safeParse(raw);
  if (!result.success) {
    throw new SymbolDataError(
      source,
      result.error.issues.map((issue) => ({
        fieldPath: formatPath(issue.path),
        detail: issue.message,
      })),
    );
  }
  return result.data;
}
