/**
 * controllers/AudioController.js
 * Controla las pistas de audio del juego (BGM y efectos).
 */

export class AudioController{

    constructor(){
        this.bgmPrimary   = new Audio('assets/audio/seg.mp3');
        this.bgmSecondary = new Audio('assets/audio/prim.mp3');
        this.sfxVictory   = new Audio('assets/audio/ganador.mp3');

        this.bgmPrimary.loop   = true;
        this.bgmSecondary.loop = true;
        this.sfxVictory.loop   = true;

        this.bgmPrimary.volume   = 0.45;
        this.bgmSecondary.volume = 0.45;
        this.sfxVictory.volume   = 0.25; // Volumen reducido para la victoria

        this.currentTrack = null;
    }

    playPrimary(){
        this.stopAll();
        this.currentTrack = this.bgmPrimary;
        this.currentTrack.currentTime = 0;
        this.currentTrack.play().catch(e => console.warn('Autoplay bloqueado:', e));
    }

    playSecondary(){
        this.stopAll();
        this.currentTrack = this.bgmSecondary;
        this.currentTrack.currentTime = 0;
        this.currentTrack.play().catch(e => console.warn('Autoplay bloqueado:', e));
    }

    playVictory(){
        this.stopAll(); // Detiene la BGM antes de lanzar la música de victoria
        this.sfxVictory.currentTime = 0;
        this.sfxVictory.play().catch(e => console.warn('Autoplay bloqueado:', e));
    }

    stopCurrent(){
        if(this.currentTrack){
            this.currentTrack.pause();
            this.currentTrack.currentTime = 0;
            this.currentTrack = null;
        }
    }

    /** Detiene ABSOLUTAMENTE todo el audio, incluyendo sfxVictory. */
    stopAll(){
        this.stopCurrent();
        // Detener la pista de victoria aunque no sea currentTrack
        this.sfxVictory.pause();
        this.sfxVictory.currentTime = 0;
    }
}
