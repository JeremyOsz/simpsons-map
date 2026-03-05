declare module "geojson-world-map/lib/world.js" {
  const world: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: { name: string; [key: string]: unknown };
      geometry: GeoJSON.Geometry;
    }>;
  };

  export default world;
}
