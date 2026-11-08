// − 2 + buttons for how many of a product are on the shopping list. Going below 1 removes it.
export function QuantityStepper({ name, quantity, onChange }: { name: string; quantity: number; onChange: (quantity: number) => void }) {
  return (
    <span className="stepper" role="group" aria-label={`How many ${name}`}>
      <button type="button" aria-label={quantity === 1 ? `Remove ${name}` : `One fewer ${name}`} onClick={() => onChange(quantity - 1)}>
        −
      </button>
      <span className="stepper-value" aria-live="polite">
        {quantity}
      </span>
      <button type="button" aria-label={`One more ${name}`} onClick={() => onChange(quantity + 1)} disabled={quantity >= 99}>
        +
      </button>
    </span>
  )
}
