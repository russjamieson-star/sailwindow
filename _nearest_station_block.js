function nearestStationId(lat, lon){
  const stations = [
    // Florida — Keys & Southwest
    { id:"8724580", name:"Key West, FL",      lat:24.5557, lon:-81.8079 },
    // Florida — Atlantic Keys & Miami corridor
    { id:"8723970", name:"Marathon, FL",      lat:24.7110, lon:-81.1065 },
    { id:"8723808", name:"Islamorada, FL",    lat:24.9250, lon:-80.6317 },
    { id:"8723170", name:"Miami Beach, FL",   lat:25.7683, lon:-80.1317 },
    { id:"8722956", name:"Fort Lauderdale, FL", lat:26.0817, lon:-80.1167 },
    // Florida — Treasure Coast & Space Coast
    { id:"8722670", name:"West Palm Beach, FL", lat:26.6128, lon:-80.0342 },
    { id:"8722495", name:"Jupiter, FL",       lat:26.9433, lon:-80.0733 },
    { id:"8722357", name:"Stuart, FL",        lat:27.2000, lon:-80.2583 },
    { id:"8722212", name:"Fort Pierce, FL",   lat:27.4700, lon:-80.2883 },
    { id:"8722125", name:"Vero Beach, FL",    lat:27.6317, lon:-80.3717 },
    { id:"8721649", name:"Cocoa, FL",         lat:28.3683, lon:-80.6000 },
    { id:"8721604", name:"Port Canaveral, FL", lat:28.4158, lon:-80.5931 },
    { id:"8721120", name:"Daytona Beach, FL", lat:29.1467, lon:-80.9633 },
    { id:"8720576", name:"St. Augustine, FL", lat:29.8917, lon:-81.3100 },
    { id:"8720218", name:"Jacksonville, FL",  lat:30.3982, lon:-81.4279 },
    { id:"8720030", name:"Fernandina Beach, FL", lat:30.6714, lon:-81.4658 },
    // Florida — Southwest Gulf (Marco Island / Naples / Fort Myers)
    { id:"8724967", name:"Marco Island, FL",  lat:25.9083, lon:-81.7283 },
    { id:"8725110", name:"Naples, FL",        lat:26.1317, lon:-81.8075 },
    { id:"8725520", name:"Fort Myers, FL",    lat:26.6478, lon:-81.8711 },
    { id:"8725744", name:"Punta Gorda, FL",   lat:26.9283, lon:-82.0650 },
    { id:"8726083", name:"Sarasota, FL",      lat:27.3317, lon:-82.5450 },
    // Florida — Tampa Bay
    { id:"8726724", name:"Clearwater Beach, FL", lat:27.9783, lon:-82.8317 },
    { id:"8726520", name:"St. Petersburg, FL", lat:27.7606, lon:-82.6269 },
    { id:"8726667", name:"Tampa — Hooker Point", lat:27.9060, lon:-82.4167 },
    { id:"8726347", name:"Tampa — Egmont Key", lat:27.6017, lon:-82.7633 },
    { id:"8726607", name:"Tampa — Gandy Bridge", lat:27.8867, lon:-82.5100 },
    // Florida — Gulf Coast
    { id:"8727520", name:"Cedar Key, FL",     lat:29.1350, lon:-83.0317 },
    { id:"8728690", name:"Apalachicola, FL",  lat:29.7244, lon:-84.9806 },
    // Florida — Panhandle
    { id:"8728912", name:"Port St. Joe, FL",  lat:29.8150, lon:-85.3133 },
    { id:"8729108", name:"Panama City, FL",   lat:30.1497, lon:-85.6644 },
    { id:"8729479", name:"Niceville — Rocky Bayou", lat:30.5070, lon:-86.4470 },
    { id:"8729501", name:"Niceville — Valparaiso", lat:30.5030, lon:-86.4930 },
    { id:"8729511", name:"Destin — East Pass", lat:30.3950, lon:-86.5130 },
    { id:"8729840", name:"Pensacola, FL",     lat:30.4033, lon:-87.2117 },
    { id:"8729807", name:"Pensacola Beach Pier", lat:30.3317, lon:-87.1550 },
    // Alabama
    { id:"8735180", name:"Dauphin Island, AL", lat:30.2500, lon:-88.0750 },
    { id:"8737048", name:"Mobile State Docks, AL", lat:30.7046, lon:-88.0396 },
    // Mississippi
    { id:"8741533", name:"Pascagoula, MS",    lat:30.3678, lon:-88.5631 },
    { id:"8744117", name:"Biloxi, MS",        lat:30.4117, lon:-88.9033 },
    { id:"8747437", name:"Bay Waveland, MS",  lat:30.3263, lon:-89.3258 },
    // Louisiana
    { id:"8760922", name:"SW Pass, LA",       lat:28.9322, lon:-89.4075 },
    { id:"8761724", name:"Grand Isle, LA",    lat:29.2633, lon:-89.9567 },
    { id:"8762075", name:"Port Fourchon, LA", lat:29.1142, lon:-90.1993 },
    { id:"8761927", name:"New Orleans, LA",   lat:30.0272, lon:-90.1133 },
    { id:"8768094", name:"Calcasieu Pass, LA", lat:29.7682, lon:-93.3429 },
    // Texas
    { id:"8770570", name:"Sabine Pass, TX",   lat:29.7284, lon:-93.8701 },
    { id:"8770475", name:"Port Arthur, TX",   lat:29.8667, lon:-93.9300 },
    { id:"8771328", name:"Port Bolivar, TX",  lat:29.3650, lon:-94.7800 },
    { id:"8770933", name:"Kemah / Clear Lake, TX", lat:29.5633, lon:-95.0667 },
    { id:"8771450", name:"Galveston Pier 21, TX", lat:29.3100, lon:-94.7933 },
    { id:"8772447", name:"Freeport, TX",      lat:28.9433, lon:-95.3025 },
    { id:"8773259", name:"Port Lavaca, TX",   lat:28.6406, lon:-96.6098 },
    { id:"8773146", name:"Matagorda City, TX", lat:28.7100, lon:-95.9139 },
    { id:"8774770", name:"Rockport, TX",      lat:28.0217, lon:-97.0467 },
    { id:"8775241", name:"Aransas Pass, TX",  lat:27.8366, lon:-97.0391 },
    { id:"8775237", name:"Port Aransas, TX",  lat:27.8397, lon:-97.0725 },
    { id:"8775870", name:"Corpus Christi, TX", lat:27.5800, lon:-97.2167 },
    { id:"8778485", name:"Port Mansfield, TX", lat:26.5642, lon:-97.2765 },
    { id:"8779770", name:"Port Isabel, TX",   lat:26.0612, lon:-97.2155 },
    { id:"8779748", name:"South Padre Island, TX", lat:26.0731, lon:-97.1675 }
  ];
  let best = stations[0], bestD = Infinity;
  for(const s of stations){ const d=Math.hypot(lat-s.lat,lon-s.lon); if(d<bestD){bestD=d; best=s;} }
  return best;
}