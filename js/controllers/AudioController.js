/**
 * controllers/AudioController.js
 * Es para controlar el tipo de sonido que empezarà a sonar cada sierto tiempo
 */

export class AudioController{

    constructor(){
        this.bgmPrimary = new Audio('assets/audio/seg.mp3');
        this.bgmSecondary = new Audio('assets/audio/prim.mp3');
        this.sfxVictory = new Audio('assets/audio/ganador.mp3'); // Audio de victoria

        this.bgmPrimary.loop = true;
        this.bgmSecondary.loop = true;
        this.sfxVictory.loop = false;

        this.bgmPrimary.volume = 0.45;
        this.bgmSecondary.volume = 0.45;

        this.currentTrack = null;
    }

    playPrimary(){
        this.stopCurrent();
        this.currentTrack = this.bgmPrimary;
        this.currentTrack.play().catch(e => console.warn("El navegador bloqueo el audtoplay: ", e));
    }

    playSecondary(){
        this.stopCurrent();
        this.currentTrack = this.bgmSecondary;
        this.currentTrack.play().catch(e => console.warn("El navegador bloqueo el autoplay: ", e));
    }

    playVictory(){
        this.stopCurrent(); // Detenemos la música de fondo
        this.sfxVictory.currentTime = 0;
        this.sfxVictory.play().catch(e => console.warn("El navegador bloqueo el autoplay: ", e));
    }

    stopCurrent(){
        if(this.currentTrack){
            this.currentTrack.pause();
            this.currentTrack.currentTime = 0;
        }
    }

    stopAll(){
        this.stopCurrent();
        this.currentTrack = null;
    }
}
