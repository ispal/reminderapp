var SpeechRecognition = SpeechRecognition || window.webkitSpeechRecognition || undefined;

if(SpeechRecognition) {
  var SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList || undefined;
  var SpeechRecognitionEvent = SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent || undefined;
  var commands = [ 'reset'];
  var grammar = '#JSGF V1.0; grammar colors; public <color> = ' + commands.join(' | ') + ' ;'

  var recognition = new SpeechRecognition();
      recognition.grammars = speechRecognitionList;
      //recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

  var speechRecognitionList = new SpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
}

var speechSynth = new SpeechSynthesisUtterance();

const padDigits = (number, digits) => {
    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
}

const calculatePercentsLeft = (value, from) => {
    return Math.floor(Math.ceil(value/1000) / (from * 60) * 100)
}

const calculateScaleFactor = (percent) => {
    return 1-(100-percent)/100;
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

const settings = {
  water: {
    warningMsg: 'Remember to drink',
    timeIsUpMsg: 'Time\'s up. You really need to drink now',
    buttonTxt: 'Drink',
    waveFrontColor: '#32BAFA',
    waveBackColor: '#2C7FBE',
    stageBg: '#1E384C',
    durationInMinutes: 1
  },
  coffee: {
    warningMsg: 'It\'s almost coffee time.',
    timeIsUpMsg: 'Time\'s up. Let\'s take a coffee break!',
    buttonTxt: 'Drink coffee',
    waveFrontColor: '#b39374',
    waveBackColor: '#7a6057',
    stageBg: '#392a2c',
    durationInMinutes: 2
  },
  break: {
    warningMsg: 'It is time to rest your eyes soon!',
    timeIsUpMsg: 'Time\'s up. Now, it\'s really time to rest your eyes!',
    buttonTxt: 'Take a break',
    waveFrontColor: '#02C39A',
    waveBackColor: '#028090',
    stageBg: '#012F35',
    durationInMinutes: 1
  }
};

new Vue({
  el: '#stage',
  data() {
    return {
        color: '',
        percents: [100],
        percentsLeft: 100,
        secondsLeft: 0,
        waveStyles: '',
        duration: 1,
        timer: [],
        voicesOpen: false,
        voices: [],
        selectedVoice: {},
        countdownObj: {},
        activeReminder: settings.water,
        menuOpen: false,
        isListening: false,
        voiceTooltipClosed: false, 
        stageBg: settings.water.stageBg
    }
  },
  mounted() {
    this.resetTimer();
    this.voices = speechSynthesis.getVoices();

    if(this.voices.length === 0) {
      speechSynthesis.onvoiceschanged = () => {
        this.voices = speechSynthesis.getVoices();
      };
    }
  },
  computed: {
    supportSpeechSynth() {
      return 'speechSynthesis' in window; 
    },
    supportSpeechRecognition() {
      return SpeechRecognition;
    }
  },
  watch: {
    percentsLeft: function(val, oldVal) {
      if (val === oldVal) {
        return;
      }
      this.percents.splice(0, 1);
      this.percents.push(val);
    }
  },
  methods: {
    setActiveReminder(reminder) {
      this.activeReminder = settings[reminder];
      this.stageBg = this.activeReminder.stageBg;
    },
    toggleMenu() {
      this.menuOpen = !this.menuOpen;
      if(this.menuOpen) {
        this.pauseTimer();
        this.waveStyles = `transform: translate3d(0,100%,0); transition-delay: .25s;`;
      }else {
        this.continueTimer();
      }
    },
    toggleVoicesMenu() {
      this.voicesOpen = !this.voicesOpen;
    },
    voiceSelected(voice) {
      this.selectedVoice = voice;
      speechSynth.voice = voice;
    },
    start(reminder) {
      this.setActiveReminder(reminder);
      this.percents = [100];
      this.timer = [];
      this.menuOpen = false;
      this.resetTimer();
    },
    resetTimer() {
      let durationInSeconds = 60 * this.activeReminder.durationInMinutes;
      this.startTimer(durationInSeconds);
    },
    startTimer(secondsLeft) {
      let now = new Date();

      // later on, this timer may be stopped
      if(this.countdown) {
        window.clearInterval(this.countdown);
      }
      
      this.countdown = countdown(ts => {
        this.secondsLeft= Math.ceil(ts.value/1000);
        this.percentsLeft = calculatePercentsLeft(ts.value,this.activeReminder.durationInMinutes);
        this.waveStyles = `transform: scale(1,${calculateScaleFactor(this.percentsLeft)})`;
        this.updateCountdown(ts);
        if(this.percentsLeft == 10) {
          this.giveWarning();
        }
        if(this.percentsLeft <= 0){
          this.timeIsUpMessage();
          this.pauseTimer();
          this.timer = [];
          setTimeout(() => {
            this.startListenVoiceCommands();
          }, 1500);
          
        }
      }, now.getTime() + (secondsLeft * 1000));
    },
    updateCountdown(ts) {
      if(this.timer.length > 2) {
        this.timer.splice(2);
      }

      const newTime = {
        id: guid(),
        value: `${padDigits(ts.minutes, 2)}:${padDigits(ts.seconds, 2)}`
      };

      this.timer.unshift(newTime);
    },
    pauseTimer() {
      window.clearInterval(this.countdown);
    },
    continueTimer() {
      if(this.secondsLeft > 0) {
        this.startTimer(this.secondsLeft-1);
      }
    },
    giveWarning() {
      speechSynth.text = this.activeReminder.warningMsg;
      window.speechSynthesis.speak(speechSynth);
    },
    timeIsUpMessage() {
      speechSynth.text = this.activeReminder.timeIsUpMsg;
      window.speechSynthesis.speak(speechSynth);
    },
    timerResetMessage() {
      speechSynth.text = `Timer reset. Time left ${this.activeReminder.durationInMinutes} ${this.activeReminder.durationInMinutes > 1 ? 'minutes': 'minute'}`;
      window.speechSynthesis.speak(speechSynth);
    },
    reset() {
      this.resetTimer();
      this.timerResetMessage();
    },
    startListenVoiceCommands() {
      if(this.isListening) return;

      this.isListening = true;
      recognition.start();
      recognition.onresult = (event) => {
        var last = event.results.length - 1;
        if(event.results[last][0].transcript == "reset") {
          this.resetTimer();
          this.timerResetMessage();
        }
      }
      recognition.onend = () => {
        this.isListening = false;
        this.voiceTooltipClosed = true;
        recognition.stop();
      }
    },
    mouseOver(type) {
      this.stageBg = settings[type].stageBg;
    },
    mouseOut() {
      this.stageBg = this.activeReminder.stageBg;
    }
  }
});
