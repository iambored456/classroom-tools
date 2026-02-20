// script.js

document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connect-button');
    const gridContainer = document.getElementById('grid');
  
    // Initialize Web Audio API
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const oscillators = {}; // To keep track of active oscillators
  
    // Define the MIDI note mapping for the 8x8 grid
    const midiNoteMapping = [];
    const startingNote = 36; // C1
  
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // Standard Launchpad grid mapping: each row is offset by 16
        const note = startingNote + row * 16 + col;
        midiNoteMapping.push(note);
      }
    }
  
    // Create grid squares dynamically
    midiNoteMapping.forEach(note => {
      const square = document.createElement('div');
      square.classList.add('square');
      square.dataset.note = note;
      gridContainer.appendChild(square);
    });
  
    // Function to light up a square
    function activateSquare(note) {
      const square = document.querySelector(`.square[data-note="${note}"]`);
      if (square) {
        square.classList.add('active');
      }
    }
  
    // Function to deactivate a square
    function deactivateSquare(note) {
      const square = document.querySelector(`.square[data-note="${note}"]`);
      if (square) {
        square.classList.remove('active');
      }
    }
  
    // Function to play a sine wave tone
    function playTone(note) {
      if (oscillators[note]) return; // Prevent multiple oscillators for the same note
  
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
  
      // Convert MIDI note to frequency
      const frequency = midiToFrequency(note);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine'; // You can change to 'square', 'sawtooth', etc.
  
      // Connect oscillator to gain node and gain node to destination
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
  
      // Set initial gain to 0 to avoid clicking sounds
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01); // Fade in
  
      oscillator.start();
      oscillators[note] = { oscillator, gainNode };
    }
  
    // Function to stop a sine wave tone
    function stopTone(note) {
      const osc = oscillators[note];
      if (osc) {
        osc.gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01); // Fade out
        osc.oscillator.stop(audioCtx.currentTime + 0.02);
        delete oscillators[note];
      }
    }
  
    // Helper function to convert MIDI note to frequency
    function midiToFrequency(midiNote) {
      return 440 * Math.pow(2, (midiNote - 69) / 12);
    }
  
    // Function to handle incoming MIDI messages
    function handleMIDIMessage(message) {
      const [status, note, velocity] = message.data;
  
      const command = status & 0xf0;
      const channel = status & 0x0f;
  
      if (command === 144 && velocity > 0) { // Note On
        activateSquare(note);
        playTone(note);
      } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
        deactivateSquare(note);
        stopTone(note);
      }
    }
  
    // Function to initialize MIDI
    function initMIDI() {
      if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
          .then(midiAccess => {
            console.log('MIDI Access Granted:', midiAccess);
  
            // Listen for MIDI messages from all inputs
            const inputs = midiAccess.inputs.values();
            for (let input of inputs) {
              console.log('Connected MIDI Input:', input.name);
              input.onmidimessage = handleMIDIMessage;
            }
  
            // Handle any future MIDI inputs
            midiAccess.onstatechange = (e) => {
              const port = e.port;
              console.log('MIDI Port State Change:', port.name, port.state);
              if (port.type === "input" && port.state === "connected") {
                port.onmidimessage = handleMIDIMessage;
                console.log('New MIDI Input Connected:', port.name);
              }
            };
  
            connectButton.textContent = "MIDI Connected";
            connectButton.disabled = true;
            console.log('MIDI Connected and Ready');
          })
          .catch(err => {
            console.error("Failed to get MIDI access", err);
            alert("Could not access your MIDI devices.");
          });
      } else {
        alert("Web MIDI API is not supported in this browser.");
      }
    }
  
    // Add event listener to the connect button
    connectButton.addEventListener('click', () => {
      // Resume the AudioContext (required by some browsers)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      initMIDI();
    });
  });
  