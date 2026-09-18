import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react';

const fontStack = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`;
// AI narrative voice — a serif, like a wine label. Everything the model
// *says* renders in this; metrics and chrome stay in Inter.
const aiSerifStack = `'Fraunces', 'Iowan Old Style', Georgia, serif`;

// Chakra v3's stock control padding is tuned tight — `xs` buttons ship at
// px-2.5 (10px) and a `md` textarea at px-3/py-2. At our type sizes the label
// sits almost on the border, and a textarea you actually paste into (the AI
// modals use rows={10}) reads as a cramped box rather than a writing surface.
//
// These recipes widen the horizontal rhythm by roughly one step per size and
// give textareas real vertical room. Heights are deliberately NOT touched:
// `h` and `--input-height` drive every toolbar and row that lines a control up
// against something else, so changing them would reflow layouts far beyond the
// padding complaint this fixes.
//
// Only the `size` variants are overridden; createSystem deep-merges these over
// defaultConfig, so every other part of each recipe (variants, focus rings,
// disabled styles) stays stock.
const buttonRecipe = defineRecipe({
  variants: {
    size: {
      '2xs': { px: '2.5' },
      xs: { px: '3.5' },
      sm: { px: '4.5' },
      md: { px: '5' },
      lg: { px: '6' },
    },
  },
});

const inputRecipe = defineRecipe({
  variants: {
    size: {
      xs: { px: '3' },
      sm: { px: '3.5' },
      md: { px: '4' },
      lg: { px: '4.5' },
    },
  },
});

// py matters more than px here: the first line of text starting 8px below the
// border is what reads as "no padding" in a tall textarea.
const textareaRecipe = defineRecipe({
  variants: {
    size: {
      xs: { px: '2.5', py: '2', scrollPaddingBottom: '2' },
      sm: { px: '3.5', py: '2.5', scrollPaddingBottom: '2.5' },
      md: { px: '4', py: '3', scrollPaddingBottom: '3' },
      lg: { px: '4.5', py: '3.5', scrollPaddingBottom: '3.5' },
    },
  },
});

const customConfig = defineConfig({
  theme: {
    recipes: {
      button: buttonRecipe,
      input: inputRecipe,
      textarea: textareaRecipe,
    },
    tokens: {
      fonts: {
        heading: { value: fontStack },
        body: { value: fontStack },
        ai: { value: aiSerifStack },
      },
      colors: {
        // Brand: wine. Claret mids for links/accents, deep bordeaux for
        // buttons and fills — one saturated voice against neutral canvas.
        brand: {
          50: { value: '#fbf2f4' },
          100: { value: '#f7e3e8' },
          200: { value: '#efc6d1' },
          300: { value: '#e19cb0' },
          400: { value: '#cd6785' },
          500: { value: '#b23e60' },
          600: { value: '#932a4a' },
          700: { value: '#7a1f3d' },
          800: { value: '#5f1830' },
          900: { value: '#481226' },
          950: { value: '#2e0a18' },
        },
        // Gold: reserved exclusively for AI surfaces (the hallmark, the
        // thread, thinking states). Never use it for ordinary chrome —
        // scarcity is what makes the pattern recognizable.
        gold: {
          50: { value: '#fbf7eb' },
          100: { value: '#f5ebcf' },
          200: { value: '#ead79f' },
          300: { value: '#dcbd68' },
          400: { value: '#cda440' },
          500: { value: '#b8892b' },
          600: { value: '#9a6f23' },
          700: { value: '#7c581e' },
          800: { value: '#61451c' },
          900: { value: '#4c3717' },
        },
      },
    },
    // Lets `colorPalette="brand"` drive Chakra v3 component recipes
    // (solid buttons, focus rings) with the wine ramp.
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: '{colors.brand.700}' },
          contrast: { value: 'white' },
          fg: { value: '{colors.brand.500}' },
          muted: { value: '{colors.brand.100}' },
          subtle: { value: '{colors.brand.50}' },
          emphasized: { value: '{colors.brand.800}' },
          focusRing: { value: '{colors.brand.500}' },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);
