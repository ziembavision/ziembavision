// import smoothscroll from 'smoothscroll-polyfill';

import volcano from './volcano';
import cms from './modules/cms';
import { d3, hsv, interpolateTerrain, svg, width, height, bufferLength, $title, $home, $volumeUp, $volumeMute, $audio, $audioButtons } from './constants';
import { buttons } from './modules';
import { debounce } from './utils';

let color,
    analyser,
    // dataLength = 5307,
    // slicedLength = 5280,
    frequencyData,
    audioCtx;

let currentData = volcano.values;
let playing = false;
let paused = false;
let currentSong;

let count = 0;
const renderData = () => {
  analyser.getByteFrequencyData(frequencyData); // Map frequency data to frequencyData typed array

  let prevData = currentData;
  currentData = prevData.map((d, i) => {
    const sliced = frequencyData.slice(0, 5307);
    let diff1 = Math.abs(d - sliced[1])/1000 + d;
    let diff2 = diff1 - 0.4;
    let diffF = (count % 100) ? diff1 : diff2;
    // let diffF = diff1;
    if (count % 300 === 0) diffF = diff1 - 10.01;
    return diffF;
  });

  if (currentData !== prevData) {
    // Update d3 visual with new data
    svg.selectAll("path")
      .data(
        d3.contours()
        .size([ volcano.width, volcano.height ])
        .thresholds(d3.range(90, 195, 5))
        (currentData)
      )
      .attr('d', d3.geoPath(
        d3.geoIdentity()
          .scale(width / volcano.width)
      ));
  }

  count++
  if (playing && !paused) requestAnimationFrame(renderData);
};

const createSvgD3 = () => {     
  color = d3.scaleSequential(interpolateTerrain)
    .domain([90, 190]);

  svg.selectAll("path")
    .data(d3.contours()
      .size([ volcano.width, volcano.height ])
      .thresholds(d3.range(90, 195, 5))
      (volcano.values)
    )
    .enter().append("path")
      .attr('d', d3.geoPath(
        d3.geoIdentity()
          .scale(width / volcano.width) 
      ))
      .attr('fill', (d) => color(d.value))
};

const audioFadeOut = () => {
  if ($audio.volume > 0.1) {
    $audio.volume -= 0.1;
    setTimeout(audioFadeOut(), 2);
  } else {
    $audio.pause();
    playing = false;
  }
};

const audioFadeIn = () => {
  if (!playing) {
    $audio.volume = 0;
    $audio.play();
    playing = true;
  }
  if ($audio.volume === 0.9) {
    $audio.volume = 1;
  }
  if ($audio.volume < 0.9) {
    $audio.volume += 0.1;
    setTimeout(audioFadeIn(), 2);
  }
}

let context = false;
const playAudio = () => {
  if (!context) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    audioCtx.createMediaElementSource($audio).connect(analyser);
    analyser.connect(audioCtx.destination);
    context = true;
  };

  $volumeUp.classList.remove('hidden');
  $volumeUp.classList.add('show');

  audioFadeIn();
  playing = true;
  paused = false;
  renderData();
};

const stopAudio = () => {
    audioFadeOut();
    if (paused) {
      $volumeMute.classList.add('hide', 'hidden');
      $volumeMute.classList.remove('show');
    } else if (!paused) {
      $volumeUp.classList.add('hide', 'hidden');
      $volumeUp.classList.remove('show');
    }
    paused = false;
    currentData = volcano.values;
};

const initAudio = () => {
  $audioButtons.forEach(button => {
    button.button.addEventListener('click', debounce(() => {
      if (currentSong !== button.src) {
        currentSong = button.src;
        playing = false;
        if (paused) {
          $volumeMute.classList.add('hide', 'hidden');
          $volumeMute.classList.remove('show');
        }
        paused = false;
      }
      $audio.src = button.src;
      if (playing || paused) {
        stopAudio()
      } else playAudio();
    }, 300));
  });

  $volumeUp.addEventListener('click', debounce(() => {
    if (playing) {
      $volumeMute.classList.remove('hide', 'hidden');
      $volumeMute.classList.add('show');
      $volumeUp.classList.add('hide');
      $volumeUp.classList.remove('show');
      audioFadeOut();
      paused = true;
    }
  }, 300));

  $volumeMute.addEventListener('click', debounce(() => {
      $volumeMute.classList.remove('show');
      $volumeMute.classList.add('hide', 'hidden');
      $volumeUp.classList.add('show');
      $volumeUp.classList.remove('hide', 'hidden');
      audioFadeIn();
      paused = false;
      renderData();
  }, 300));
};

const init = () => {
  frequencyData = new Uint8Array(bufferLength); // array of integers

  cms();
  createSvgD3();
  buttons();
  initAudio();

  $title.addEventListener('click', () => {
    $home.scrollIntoView({behavior: 'smooth'});
    currentData = volcano.values;
  });
};

init();