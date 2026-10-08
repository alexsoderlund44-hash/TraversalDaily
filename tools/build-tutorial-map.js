#!/usr/bin/env node
/* Writes data/tutorial-map.js: the Iberian corner of the chart (land, coast glow, graticule) and the cities the
   how-to-play walkthrough uses, projected into a 440x400 box, so the walkthrough shows the real chart without
   loading d3 or the world on the home page. Run: node tools/build-tutorial-map.js */
const fs = require('fs'), path = require('path');
const d3 = require('../vendor/d3.min.js'), topojson = require('../vendor/topojson-client.min.js');
global.window = {}; eval(fs.readFileSync(path.join(__dirname, '..', 'data', 'world.js'), 'utf8')); eval(fs.readFileSync(path.join(__dirname, '..', 'data', 'cities.js'), 'utf8'));
const W = window.WORLD_TOPO, C = window.TRAVERSE_CITIES;
const WID = 440, HEI = 400;
const box = { type: 'Polygon', coordinates: [[[-11, 35], [-11, 45], [6.5, 45], [6.5, 35], [-11, 35]]] };
const proj = d3.geoMercator().fitSize([WID, HEI], box).clipExtent([[-20, -20], [WID + 20, HEI + 20]]);
const pth = d3.geoPath(proj);
const land = topojson.merge(W, W.objects.countries.geometries);
const grat = d3.geoGraticule().step([2, 2])();
const want = ['lis', 'por', 'mad', 'bcn', 'sev', 'val', 'bio', 'mal', 'mrs', 'tls', 'bod'];
const cities = C.filter(c => want.includes(c[0]) || (c[5] > -11 && c[5] < 6.5 && c[4] > 35 && c[4] < 45)).map(c => { const [x, y] = proj([c[5], c[4]]); return { id: c[0], name: c[1], country: c[2], flag: c[3], hub: c[6], x: +x.toFixed(1), y: +y.toFixed(1) }; });
const round = d => d.replace(/(\d+\.\d{2})\d+/g, '$1');
const out = { w: WID, h: HEI, land: round(pth(land)), grat: round(pth(grat)), cities };
fs.writeFileSync(path.join(__dirname, '..', 'data', 'tutorial-map.js'), 'window.TUTORIAL_MAP=' + JSON.stringify(out) + ';\n');
console.log('tutorial map:', (JSON.stringify(out).length / 1024).toFixed(1), 'KB,', cities.map(c => c.id).join(' '));
