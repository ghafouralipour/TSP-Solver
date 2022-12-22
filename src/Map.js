import React, { useRef,useState } from 'react';
import geojson from './tr-cities.json';
import { geoMercator, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import * as d3 from "d3";
import { createPath, distance } from './Path';

const width = 960;
const height = 500;
let dotscale = 5;
var cities = [];
var pathTSP = {};

function Map() {
  let [distanceHistory, setDistanceHistory] = useState([]);
  let [stats, setStats] = useState({ visited: 0, shortestPath: undefined })
  const [overCity, setOverCity] = useState("Türkiye");
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  let projection = geoMercator().fitExtent(
    [[0, 0], [width * 0.9, height * 0.9]],
    geojson
  );
  const path = geoPath().projection(projection);
  
  const componentRef = useRef();
  
  const drawCities = () => {
    let tempCities =[];   
    cities.forEach(function(city) {
      //console.log(city["xy"])
      tempCities.push(city["xy"]);
    });
  
    let svg = document.getElementById('svg2d');      
    d3.select(svg).selectAll('circle').data(tempCities).enter()
      .append('circle')
        .attr('cx', function (d) { return d[0]; })
        .attr('cy', function (d) { return d[1]; })
        .attr('r', dotscale)
        .attr('class', 'city');
  }
  
  const handleRun =()=>{
    console.log('Run Clicked');    
    if(cities.length>0){
      greedySolver();        
      setTimeout(function () { 
        drawTSPPaths(pathTSP); 
        findAllDistance(pathTSP);
      }, 1000);
    }
    
  }
  const rotate = (arr, count = 1) => {
    return [...arr.slice(count, arr.length), ...arr.slice(0, count)];
  };
  function drawTSPPaths(ipath) {
    
    let input_path = ipath.path;
    //console.log('------',ipath.path);
    var paths =[];
    let tempCities =[];   
    cities.forEach(function(city) {
      //console.log(city["xy"])
      tempCities.push(city["xy"]);
    });

    paths.push([tempCities[0],tempCities[0]]);
    
    while(input_path[0]!==0){
      input_path = rotate(input_path, 1);
    }
    //console.log('shift path',input_path);
    for(let i=0;i<input_path.length-1;i++){
      paths.push([tempCities[input_path[i]],tempCities[input_path[i+1]]]);
    }
    paths.push([tempCities[input_path[input_path.length-1]],tempCities[0]]);
    //console.log('paths',paths);
    let svg = document.getElementById('svg2d');      
    d3.select(svg).selectAll('path.connection').remove();
    d3.select(svg).selectAll('path.connection').data(paths).enter()
      .append('path')
        .attr('d', function(d) {
          var dx = d[1][0] - d[0][0],
              dy = d[1][1] - d[0][1],
              dr = Math.sqrt(dx * dx + dy * dy);
          return "M" + d[0][0] + "," + d[0][1] + "A" + dr + "," + dr + " 0 0,1 " + d[1][0] + "," + d[1][1];
        })
        .attr('class', 'connection')
      .attr("marker-end", "url(#arrow)");      
  }

    function deg2rad(deg) {
      return deg * (Math.PI/180)
    }    

    function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2-lat1);  // deg2rad below
      var dLon = deg2rad(lon2-lon1); 
      var a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ; 
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      var d = R * c; // Distance in km
      return d;
    }
    function findAllDistance(ipath) {
      let input_path = ipath.path;
      while(input_path[0]!==0){
        input_path = rotate(input_path, 1);
      }
      console.log(input_path);
      console.log("latlon",cities[0]["latlon"]);
      let all_distance = 0;
      for(let i=0;i<cities.length-1;i++){
        all_distance += getDistanceFromLatLonInKm(cities[i]["latlon"][0],cities[i]["latlon"][1],
                                                  cities[i+1]["latlon"][0],cities[i+1]["latlon"][1]);
      }
      all_distance += getDistanceFromLatLonInKm(cities[cities.length-1]["latlon"][0],cities[cities.length-1]["latlon"][1],
                                                  cities[0]["latlon"][0],cities[0]["latlon"][1]);
      console.log('all distance',all_distance);
      setOverCity('Total Distance: '+ all_distance.toFixed(0)+' KM');
    }
    
    const handleReset =()=>{
      console.log('Reset Clicked');
      cities = [];
      let svg = document.getElementById('svg2d');      
      d3.select(svg).selectAll('circle').remove();
      d3.select(svg).selectAll('path.connection').remove();
    }    

  const greedySolver = async () => {    
    let tempCities =[];   
    cities.forEach(function(city) {
      tempCities.push(city["xy"]);
    });

    const getClosestCity = (tempCities, idx, patha) => {
      let minDistance = Infinity;
      let minIdx = null;
      for (let i = 0; i < tempCities.length; i++) {
        if (patha.includes(i))
          continue;
        let d = distance(tempCities[i], tempCities[idx]);
        if (d < minDistance) {
          minDistance = d;
          minIdx = i;
        }
      }
      return minIdx;
    }

    setDistanceHistory(Array(tempCities.length));
    let minDistance = Infinity;
    for (let i = 0; i < tempCities.length; i++) {
      let steps = Array(tempCities.length).fill(-1);
      steps[0] = i;
      for (let j = 1; j < tempCities.length; j++) {
        let closestIdx = getClosestCity(tempCities, steps[j - 1], steps);
        steps[j] = closestIdx;
      }
      let pathTemp = createPath(tempCities.length, tempCities, steps);
      if (pathTemp.distance < minDistance) {
        minDistance = pathTemp.distance;
        // console.log('pathTemp',pathTemp)
        pathTSP= pathTemp;
      }
      let history = distanceHistory;
      history[i] = minDistance;
      setDistanceHistory(history);
      let s = stats;
      s['visited'] += 1;
      s['shortestPath'] = minDistance;
      setStats(s);     

      await wait(60);
    }
  }
  
  return (
    <div>     
        <h1>  {overCity} </h1>     
      <svg width={width} height={height} id="svg2d" ref={componentRef} >
        <defs>    
          <marker
            id="arrow"
            // markerUnits="strokeWidth"
            markerWidth="6"
            markerHeight="6"
            viewBox="0 -5 10 10"
            refX="15"
            refY="-1.5"
            orient="auto">
            <path d="M0,-5L10,0L0,5"></path>
          </marker>
        </defs>
        <g className="geojson-layer">
          {
            geojson.features.map((d,index) => (
              <path
                key={index}
                d={path(d)}
                fill="#eee"
                stroke="#0e1724"
                strokeWidth="1"
                strokeOpacity="0.5"
                onMouseEnter={(e) => {
                  setOverCity(d.properties.name);
                  select(e.target)
                    .attr('fill', '#dc3522')
                }}
                onMouseOut={(e) => {
                  setOverCity('Türkiye');
                  select(e.target)
                    .attr('fill', '#eee')
                }}
                onClick={(e) => {
                  cities.push({xy:d3.pointer(e),latlon:projection.invert(d3.pointer(e)),name:d.properties.name});                  
                  console.log('point inversion',projection.invert(d3.pointer(e)));                  
                  drawCities();
                }}
              />
            ))
          }
        </g>
      </svg>
      <p>
        <button id="run" onClick={handleRun}>Run</button>
        <button id="reset" onClick={handleReset}>Reset</button>
      </p>
    </div>
  )
    
}
  
export default Map;
  