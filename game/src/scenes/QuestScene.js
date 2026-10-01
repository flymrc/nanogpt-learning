import Phaser from 'phaser';
import { mountQuest } from '../quest/quest.js';
import { setCourse } from '../i18n/locale.js';
import { cancelSpeech } from '../audio/sound.js';

/** Short, playable child-first route. The original scenes remain intact. */
export default class QuestScene extends Phaser.Scene {
  constructor() { super('Quest'); }
  create(data = {}) {
    const route = location.hash.match(/^#quest\/(nanogpt|rag|embed)\/([1-5])$/);
    const course = data.course || route?.[1] || 'nanogpt';
    const index = data.index ?? (route ? Number(route[2])-1 : 0);
    setCourse(course);
    cancelSpeech();
    const cleanup = mountQuest(this, course, index);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  }
}
