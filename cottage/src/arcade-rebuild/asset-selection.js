import { ASSETS, LAYERS, LAYER_ASSETS } from './config.js?v=build-v100';

export function selectAssets(development = false) {
  if (development) return { assets: ASSETS, layers: LAYER_ASSETS };
  return {
    assets: Object.fromEntries(Object.entries(ASSETS).filter(([group]) => group !== 'animalLab')),
    layers: Object.fromEntries(LAYERS
      .filter(layer => layer.visible !== false && LAYER_ASSETS[layer.name]?.[layer.variants[0]])
      .map(layer => [layer.name, { [layer.variants[0]]: LAYER_ASSETS[layer.name][layer.variants[0]] }])),
  };
}

export function textureEntries(selection) {
  const entries = Object.entries(selection.assets).flatMap(([group, variants]) =>
    Object.entries(variants).map(([variant, path]) => [`${group}:${variant}`, path]));
  for (const [layer, variants] of Object.entries(selection.layers)) {
    for (const [variant, asset] of Object.entries(variants)) {
      if (Array.isArray(asset)) asset.forEach((path, index) => entries.push([`layer:${layer}:${variant}:${index}`, path]));
      else entries.push([`layer:${layer}:${variant}`, asset]);
    }
  }
  return entries;
}
