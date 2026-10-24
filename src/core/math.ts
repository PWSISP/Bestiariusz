/** Limits `value` to the closed range [min, max]. Throws RangeError for NaN or min > max. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError('min must not be greater than max');
  }

  if (Number.isNaN(value) || Number.isNaN(min) || Number.isNaN(max)) {
    throw new RangeError('Arguments must not be NaN');
  }

  if (value < min) {
    return min;
  } else if (value > max) {
    return max;
  } else {
    return value;
  }
}
