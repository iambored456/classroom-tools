import './style.css'

document.addEventListener('DOMContentLoaded', () => {
  const connectButton = document.getElementById('connect-button') as HTMLButtonElement
  const midiOutputSelect = document.getElementById('midi-output') as HTMLSelectElement
  const statusDisplay = document.getElementById('status') as HTMLElement
  const gridContainer = document.getElementById('grid') as HTMLDivElement
  const scoreDisplay = document.getElementById('score-display') as HTMLElement
  const timerSelect = document.getElementById('timer-select') as HTMLSelectElement
  const startButton = document.getElementById('start-button') as HTMLButtonElement
  const resetButton = document.getElementById('reset-button') as HTMLButtonElement
  const timerDisplay = document.getElementById('timer-display') as HTMLElement

  let midiOutput: MIDIOutput | null = null

  // Define the MIDI note mapping for the 8x8 grid based on Launchpad X's Programmer Mode
  const midiNoteMapping: number[] = []
  const startingNote = 11
  const endingNote = 88
  const rowIncrement = 10

  const colorMap: { hex: string; velocity: number }[] = [
    { hex: '#f090ae', velocity: 10 },
    { hex: '#f59383', velocity: 20 },
    { hex: '#ea9e5e', velocity: 30 },
    { hex: '#d0ae4e', velocity: 40 },
    { hex: '#a8bd61', velocity: 50 },
    { hex: '#76c788', velocity: 60 },
    { hex: '#41cbb5', velocity: 70 },
    { hex: '#33c6dc', velocity: 80 },
    { hex: '#62bbf7', velocity: 90 },
    { hex: '#94adff', velocity: 100 },
    { hex: '#bea0f3', velocity: 110 },
    { hex: '#dd95d6', velocity: 120 },
  ]

  // Fixed Row Order for Correct Orientation
  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const note = startingNote + row * rowIncrement + col
      if (note <= endingNote) {
        midiNoteMapping.push(note)
      }
    }
  }

  // Create grid squares dynamically
  midiNoteMapping.forEach((note) => {
    const square = document.createElement('div')
    square.classList.add('square')
    square.dataset.note = String(note)
    gridContainer.appendChild(square)
  })

  function populateMIDIDevices(midiAccess: MIDIAccess): void {
    const outputs = Array.from(midiAccess.outputs.values())
    midiOutputSelect.innerHTML = ''
    outputs.forEach((output, index) => {
      const option = document.createElement('option')
      option.value = String(index)
      option.text = `${output.name} (${output.manufacturer})`
      midiOutputSelect.appendChild(option)
    })
    if (outputs.length > 0) {
      midiOutputSelect.selectedIndex = 0
      midiOutput = outputs[0]
      statusDisplay.innerText = `Connected to: ${midiOutput.name}`
      switchToProgrammerMode()
      setTimeout(() => {
        clearAllPads()
        startFreeplay()
      }, 500)
    } else {
      statusDisplay.innerText = 'No MIDI Output Devices Found.'
    }
  }

  function sendMIDIMessage(message: number[]): void {
    if (midiOutput) {
      try {
        midiOutput.send(new Uint8Array(message))
      } catch (error) {
        console.error('Failed to send MIDI message:', error)
        alert('Failed to send MIDI message. Ensure SysEx access is enabled.')
      }
    }
  }

  function switchToProgrammerMode(): void {
    sendMIDIMessage([0xf0, 0x00, 0x20, 0x29, 0x02, 0x0c, 0x0e, 0x01, 0xf7])
  }

  function clearAllPads(): void {
    midiNoteMapping.forEach((note) => turnOffButton(note))
  }

  function lightButton(note: number, velocity: number, channel = 1): void {
    const statusByte = channel === 2 ? 0x91 : channel === 3 ? 0x92 : 0x90
    sendMIDIMessage([statusByte, note, velocity])
  }

  function turnOffButton(note: number): void {
    sendMIDIMessage([0x80, note, 0])
  }

  let currentActiveNote: number | null = null

  function selectRandomButton(): void {
    if (currentActiveNote !== null) {
      turnOffButton(currentActiveNote)
      removeWebActive(currentActiveNote)
    }
    const selectedNote = midiNoteMapping[Math.floor(Math.random() * midiNoteMapping.length)]
    currentActiveNote = selectedNote
    const selectedColor = getRandomColor()
    lightButton(selectedNote, selectedColor.velocity, 1)
    const square = document.querySelector<HTMLDivElement>(`.square[data-note="${selectedNote}"]`)
    if (square) {
      square.classList.add('active-web')
      square.style.backgroundColor = selectedColor.hex
    }
  }

  function getRandomColor(): { hex: string; velocity: number } {
    return colorMap[Math.floor(Math.random() * colorMap.length)]
  }

  function removeWebActive(note: number): void {
    const square = document.querySelector<HTMLDivElement>(`.square[data-note="${note}"]`)
    if (square) {
      square.classList.remove('active-web')
      square.style.backgroundColor = '#333333'
    }
  }

  function handleMIDIMessage(message: MIDIMessageEvent): void {
    if (!message.data) return
    const status = message.data[0]
    const note = message.data[1]
    const velocity = message.data[2]
    if ((status & 0xf0) === 0x90 && velocity > 0 && note === currentActiveNote) {
      updateScore()
      turnOffButton(note)
      removeWebActive(note)
      selectRandomButton()
    }
  }

  function initMIDI(): void {
    if (!navigator.requestMIDIAccess) {
      alert('Web MIDI API is not supported in this browser.')
      return
    }
    navigator
      .requestMIDIAccess({ sysex: true })
      .then((midiAccess: MIDIAccess) => {
        populateMIDIDevices(midiAccess)
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = handleMIDIMessage
        }
        midiAccess.onstatechange = (e: MIDIConnectionEvent) => {
          const port = e.port
          if (!port) return
          if (port.type === 'input' && port.state === 'connected') {
            ;(port as MIDIInput).onmidimessage = handleMIDIMessage
          }
          if (port.type === 'output') populateMIDIDevices(midiAccess)
        }
        switchToProgrammerMode()
        setTimeout(() => {
          clearAllPads()
          startFreeplay()
        }, 500)
      })
      .catch((err: unknown) => {
        console.error('Failed to get MIDI access', err)
        alert(
          'Could not access your MIDI devices. Ensure SysEx access is enabled and the device is connected.',
        )
      })
  }

  let score = 0

  function updateScore(): void {
    score++
    scoreDisplay.innerText = `Score: ${score}`
  }

  let timer: ReturnType<typeof setInterval> | null = null
  let timeRemaining = 0

  function pad(num: number): string {
    return num < 10 ? '0' + num : String(num)
  }

  function updateTimerDisplay(): void {
    timerDisplay.innerText = `Time: ${pad(Math.floor(timeRemaining / 60))}:${pad(timeRemaining % 60)}`
  }

  function countdown(): void {
    timeRemaining--
    updateTimerDisplay()
    if (timeRemaining <= 0) {
      clearInterval(timer!)
      endGame()
    }
  }

  function startFreeplay(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    score = 0
    updateScore()
    timerDisplay.innerText = 'Time: --:--'
    clearAllPads()
    selectRandomButton()
  }

  function startGame(): void {
    startButton.disabled = true
    resetButton.disabled = true
    timerSelect.disabled = true
    initiateLaunchpadCountdown()
      .then(() => {
        score = 0
        updateScore()
        timeRemaining = parseInt(timerSelect.value, 10)
        updateTimerDisplay()
        if (timer) clearInterval(timer)
        timer = setInterval(countdown, 1000)
        selectRandomButton()
        resetButton.disabled = false
      })
      .catch((err: unknown) => {
        console.error('Error during Launchpad countdown:', err)
        startButton.disabled = false
        resetButton.disabled = false
        timerSelect.disabled = false
      })
  }

  function endGame(): void {
    flashAllButtons()
    startButton.disabled = false
    timerSelect.disabled = false
    resetButton.disabled = false
  }

  function flashAllButtons(): void {
    let flashCount = 0
    const flashTimer = setInterval(() => {
      midiNoteMapping.forEach((note) => lightButton(note, getRandomColor().velocity, 2))
      if (++flashCount >= 20) {
        clearInterval(flashTimer)
        clearAllPads()
      }
    }, 100)
  }

  function initiateLaunchpadCountdown(): Promise<void> {
    const digitPatterns: Record<number, number[]> = {
      5: [11, 12, 13, 14, 25, 35, 44, 43, 42, 41, 51, 61, 71, 72, 73, 74, 75, 76],
      4: [14, 24, 34, 44, 35, 36, 33, 32, 31, 41, 51, 61, 71],
      3: [21, 12, 13, 14, 25, 35, 44, 43, 55, 65, 74, 73, 72, 61],
      2: [11, 12, 13, 14, 15, 21, 32, 43, 54, 65, 74, 73, 72, 61],
      1: [11, 12, 13, 14, 15, 23, 33, 43, 53, 63, 73, 62, 61],
    }

    function getNoteFromButton(buttonNumber: number): number {
      const s = String(buttonNumber)
      const row = parseInt(s.charAt(0), 10) - 1
      const col = parseInt(s.charAt(1), 10) - 1
      return startingNote + row * rowIncrement + col
    }

    return new Promise<void>((resolve, reject) => {
      let i = 0
      const digits = [5, 4, 3, 2, 1]

      function displayNextDigit(): void {
        if (i >= digits.length) {
          resolve()
          return
        }
        const digit = digits[i]
        const pattern = digitPatterns[digit]
        if (!pattern) {
          reject(`No pattern defined for digit ${digit}`)
          return
        }
        pattern.forEach((b) => lightButton(getNoteFromButton(b), 100, 1))
        timerDisplay.innerText = `Get Ready: ${digit}`
        setTimeout(() => {
          pattern.forEach((b) => turnOffButton(getNoteFromButton(b)))
          i++
          displayNextDigit()
        }, 1000)
      }

      displayNextDigit()
    })
  }

  function resetGame(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    score = 0
    updateScore()
    timerDisplay.innerText = 'Time: 00:00'
    clearAllPads()
    startButton.disabled = false
    timerSelect.disabled = false
    resetButton.disabled = false
    startFreeplay()
  }

  connectButton.addEventListener('click', () => {
    initMIDI()
    connectButton.disabled = true
    connectButton.innerText = 'MIDI Connected'
  })

  midiOutputSelect.addEventListener('change', () => {
    const selectedIndex = midiOutputSelect.selectedIndex
    navigator
      .requestMIDIAccess({ sysex: true })
      .then((midiAccess: MIDIAccess) => {
        const outputs = Array.from(midiAccess.outputs.values())
        if (selectedIndex >= 0 && selectedIndex < outputs.length) {
          midiOutput = outputs[selectedIndex]
          statusDisplay.innerText = `Connected to: ${midiOutput.name}`
          switchToProgrammerMode()
          setTimeout(() => {
            clearAllPads()
            startFreeplay()
          }, 500)
        } else {
          midiOutput = null
          statusDisplay.innerText = 'Selected MIDI Output not found.'
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to get MIDI access during output change', err)
        alert(
          'Could not access your MIDI devices. Ensure SysEx access is enabled and the device is connected.',
        )
      })
  })

  startButton.addEventListener('click', () => {
    startGame()
    startButton.disabled = true
    timerSelect.disabled = true
    resetButton.disabled = false
  })

  resetButton.addEventListener('click', resetGame)
})
