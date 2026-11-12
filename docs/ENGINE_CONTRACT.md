# Nutrition engine contract

The first implementation is deliberately small and pure:
- Mifflin–St Jeor RMR requires explicit sex coefficient, age, weight and height.
- Energy target requires an explicit PAL and explicit goal adjustment.
- Macro allocation requires explicit protein coefficient and fat energy ratio.
- No hidden PAL, goal, protein or fat defaults are introduced by the calculation functions.
- Functions return deterministic values and reject invalid inputs.
- Classifications are attached to outputs, but production records must additionally persist exact formula/rule versions and scientific source-version IDs.

Run the initial tests with:

```sh
node --test packages/nutrition/test/*.test.mjs
```

This is a calculation kernel, not yet a complete individualized nutrition prescription. Clinical exclusions, pregnancy/lactation, minors, disease states, contraindication screening, verified PAL selection and source metadata still require explicit product and professional review before production use.
