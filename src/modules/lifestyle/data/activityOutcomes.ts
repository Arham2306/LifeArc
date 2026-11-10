import type { HobbyId } from '../types';

export interface ActivityOutcome {
  title: string;
  message: string;
}

type Band = 'first' | 'learning' | 'advanced' | 'mastered';

function bandFor(level: number): Band {
  if (level <= 0) return 'first';
  if (level <= 2) return 'learning';
  if (level <= 4) return 'advanced';
  return 'mastered';
}

const GAMING: Record<Band, Record<string, ActivityOutcome>> = {
  first: {
    computer_home: {
      title: 'First saved game',
      message: 'You finish one short game on the home computer and save with the manual still open.',
    },
    computer_rig: {
      title: 'First night on the rig',
      message: 'The gaming rig hums while you finish one short game and save with the manual still open.',
    },
  },
  learning: {
    computer_home: {
      title: 'A little further',
      message: 'You get a little further on the home computer, then write down where you stopped.',
    },
    computer_rig: {
      title: 'A little further',
      message: 'You get a little further on the gaming rig, then write down where you stopped.',
    },
  },
  advanced: {
    computer_home: {
      title: 'Outgrown',
      message: 'You hit a game the home computer cannot run and stop for the night.',
    },
    computer_rig: {
      title: 'A clear time',
      message: 'You clear the game the old machine could not run and write down a clear time.',
    },
  },
  mastered: {
    computer_home: {
      title: 'Every corner',
      message: 'You know every corner of what this home computer can still play.',
    },
    computer_rig: {
      title: 'From memory',
      message: 'You play a full match from memory and the gaming rig keeps up.',
    },
  },
};

const MUSIC: Record<Band, Record<string, ActivityOutcome>> = {
  first: {
    instrument_keyboard: {
      title: 'First tune',
      message: 'You pick out a simple tune on the practice keyboard.',
    },
    instrument_piano: {
      title: 'First tune',
      message: 'You try a simple tune on the upright piano.',
    },
  },
  learning: {
    instrument_keyboard: {
      title: 'Scales',
      message: 'You stay with the scales until the practice keyboard feels familiar.',
    },
    instrument_piano: {
      title: 'Scales',
      message: 'You stay with the scales until the upright piano feels familiar.',
    },
  },
  advanced: {
    instrument_keyboard: {
      title: 'Out of voice',
      message: 'The piece needs a real piano. The practice keyboard runs out of voice.',
    },
    instrument_piano: {
      title: 'The middle of the piece',
      message: 'You play the middle of a real piece on the upright piano and keep your place.',
    },
  },
  mastered: {
    instrument_keyboard: {
      title: 'Everything it can hold',
      message: 'You play everything the practice keyboard can hold, cleanly.',
    },
    instrument_piano: {
      title: 'From memory',
      message: 'You play a full piece from memory on the upright piano.',
    },
  },
};

const SCHOOL_MUSIC: ActivityOutcome = {
  title: 'Still in your hands',
  message: 'You sit down and find the school pieces are still in your hands.',
};

export function activityOutcome(input: {
  hobby: HobbyId;
  level: number;
  equipmentId: string;
  schoolMusicYears: number;
}): ActivityOutcome {
  if (input.hobby === 'music' && input.level <= 0 && input.schoolMusicYears > 0) {
    return SCHOOL_MUSIC;
  }
  const band = bandFor(input.level);
  const table = input.hobby === 'gaming' ? GAMING : MUSIC;
  const equipmentScene = table[band][input.equipmentId];
  if (equipmentScene) return equipmentScene;
  const fallback = Object.values(table[band])[0];
  return fallback ?? { title: 'A quiet hour', message: 'You spend the hour on the hobby and leave it there.' };
}

export function bookOutcome(title: string, grantedSmarts: boolean): ActivityOutcome {
  if (grantedSmarts) {
    return {
      title: `Finished ${title}`,
      message: `You finish ${title} and keep one clear idea from it.`,
    };
  }
  return {
    title: `Finished ${title}`,
    message: `You finish ${title}. You already learned something new this year, so the book stays a pleasure rather than a lesson.`,
  };
}
