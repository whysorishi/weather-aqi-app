const API_KEY = "4da4eeae7adb1e3b95e20c40c0e68b72";



const GEO = 'https://api.openweathermap.org/geo/1.0/direct';
const WEATHER = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';
const AQI = 'https://api.openweathermap.org/data/2.5/air_pollution';

let tempChart, aqiChart;

/* Theme toggle */
$('#themeToggle').click(()=>{
  $('body').toggleClass('dark');
  $('#themeToggle').text($('body').hasClass('dark') ? '☀️' : '🌙');
});

/* Search */
$('#searchBtn').click(searchCity);
$('#city').on('keydown',e=>{
  if(e.key === 'Enter') searchCity();
});

function searchCity(){
  const city = $('#city').val().trim();
  if(!city) return;

  fetch(`${GEO}?q=${city}&limit=1&appid=${API_KEY}`)
    .then(res => res.json())
    .then(data => fetchAll(data[0].lat, data[0].lon))
    .catch(()=>alert('City not found'));
}

/* Fetch all APIs */
async function fetchAll(lat, lon){
  const w = await fetch(`${WEATHER}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
  const wd = await w.json();

  $('#temp').text(`${Math.round(wd.main.temp)}°C`);
  $('#place').text(`${wd.name}, ${wd.sys.country}`);
  $('#desc').text(wd.weather[0].description);

  $('#feels').text(`${Math.round(wd.main.feels_like)}°C`);
  $('#humidity').text(`${wd.main.humidity}%`);
  $('#wind').text(`${wd.wind.speed} m/s`);
  $('#visibility').text(`${(wd.visibility/1000).toFixed(1)} km`);
  $('#precip').text(`${wd.rain?.['1h'] || 0} mm`);
  $('#sunrise').text(moment.unix(wd.sys.sunrise).format('hh:mm A'));
  $('#sunset').text(moment.unix(wd.sys.sunset).format('hh:mm A'));

  const f = await fetch(`${FORECAST}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
  const fd = await f.json();
  renderHourly(fd);
  renderDaily(fd);
  renderTempChart(fd);

  const a = await fetch(`${AQI}?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
  const ad = await a.json();
  renderRealAQI(ad.list[0].components);
  renderAQIChart(ad.list[0].components);
}

/* AQI calculation */
function calcAQI(pm){
  const bp = [
    [0,12,0,50,'Good','aqi-good'],
    [12.1,35.4,51,100,'Moderate','aqi-moderate'],
    [35.5,55.4,101,150,'Unhealthy (SG)','aqi-usg'],
    [55.5,150.4,151,200,'Unhealthy','aqi-unhealthy'],
    [150.5,250.4,201,300,'Very Unhealthy','aqi-very'],
    [250.5,500.4,301,500,'Hazardous','aqi-hazard']
  ];
  for(const b of bp){
    if(pm>=b[0] && pm<=b[1]){
      const aqi = ((b[3]-b[2])/(b[1]-b[0]))*(pm-b[0])+b[2];
      return {v:Math.round(aqi),l:b[4],c:b[5]};
    }
  }
}

function renderRealAQI(c){
  const a = calcAQI(c.pm2_5);
  $('#aqiValue').text(a.v);
  $('#aqiLabel').text(a.l);
  $('#aqiCard').attr('class','aqi-card '+a.c);
}

/* Forecast */
function renderHourly(d){
  $('#hourly').html(
    d.list.slice(0,8).map(h=>`
      <div class="box">
        <div>${moment(h.dt_txt).format('HH:mm')}</div>
        <b>${Math.round(h.main.temp)}°C</b>
      </div>`).join('')
  );
}

function renderDaily(d){
  const days = {};
  d.list.forEach(i=>{
    const day = i.dt_txt.split(' ')[0];
    if(!days[day]) days[day]={min:i.main.temp_min,max:i.main.temp_max};
    else{
      days[day].min=Math.min(days[day].min,i.main.temp_min);
      days[day].max=Math.max(days[day].max,i.main.temp_max);
    }
  });

  $('#daily').html(
    Object.keys(days).slice(0,5).map(dy=>`
      <div class="box">
        <div>${moment(dy).format('ddd')}</div>
        <div>⬆ ${Math.round(days[dy].max)}°C</div>
        <div>⬇ ${Math.round(days[dy].min)}°C</div>
      </div>`).join('')
  );
}

/* Charts */
function renderTempChart(d){
  const s = d.list.slice(0,8);
  if(tempChart) tempChart.destroy();
  tempChart = new Chart(document.getElementById('tempChart'),{
    type:'line',
    data:{
      labels:s.map(i=>moment(i.dt_txt).format('HH:mm')),
      datasets:[{
        data:s.map(i=>i.main.temp),
        fill:true,
        tension:0.4,
        backgroundColor:'rgba(33,150,243,0.2)',
        borderColor:'#2196F3'
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{x:{grid:{display:false}},y:{grid:{display:false}}}
    }
  });
}

function renderAQIChart(c){
  if(aqiChart) aqiChart.destroy();
  aqiChart = new Chart(document.getElementById('aqiChart'),{
    type:'bar',
    data:{
      labels:['PM2.5','PM10','CO','NO₂','SO₂','O₃'],
      datasets:[{
        data:[c.pm2_5,c.pm10,c.co,c.no2,c.so2,c.o3],
        borderRadius:8
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{x:{grid:{display:false}},y:{grid:{display:false}}}
    }
  });
}
/* ===== ENTRANCE ANIMATION ===== */
$('.card, .stat, .box, canvas').addClass('fade-up');

setTimeout(()=>{
  $('.fade-up').each(function(i){
    const el = $(this);
    setTimeout(()=>el.addClass('show'), i * 80);
  });
}, 300);
