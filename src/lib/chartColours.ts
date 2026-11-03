// Shop colours for the price chart, in a fixed order that stays tellable apart with
// colour-blindness (checked with the dataviz palette validator against the app's
// light #ffffff and dark #112219 surfaces). A 9th shop and beyond share the "other" grey.
const SHOP_COLOURS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}
const OTHER = '#898781'

export const CHART_INK = {
  light: { surface: '#ffffff', grid: '#e6f2ea', axis: '#cfe2d6', muted: '#4b6358', text: '#0f2a20' },
  dark: { surface: '#112219', grid: '#1a3226', axis: '#2b4a3b', muted: '#a5bdb0', text: '#eaf6ef' },
}

export function shopColour(index: number, dark: boolean): string {
  const colours = dark ? SHOP_COLOURS.dark : SHOP_COLOURS.light
  return index >= 0 && index < colours.length ? colours[index] : OTHER
}
