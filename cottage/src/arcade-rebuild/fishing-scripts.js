export const FISHING_OUTCOMES = [
  { key: 'normal', weight: 88, catchType: 'fish' },
  { key: 'weeds', weight: 5, catchType: 'weeds', noBark: true, smallSplash: true },
  { key: 'stolen_bait', weight: 4, catchType: 'empty' },
  { key: 'no_bite', weight: 3, catchType: 'empty', noBite: true, noBark: true },
];

function normalScript(speciesKey, sizeKey, key, lines) {
  return {
    speciesKey,
    sizeKey,
    key,
    weight: 1,
    lines: { cast: '', splash: lines.throwBack, ...lines },
  };
}

function outcomeScript(key, lines) {
  return { key, weight: 1, lines: { cast: '', splash: lines.throwBack || '', ...lines } };
}

export const FISHING_SCRIPTS = {
  normal: [
    normalScript('bass', 'regular', 'bass_regular_weedline_tap', {
      tease: '', bite: 'GOT ONE.', reel: '', emerge: 'A BASS.',
      holdStart: 'ALL MOUTH.', holdEnd: '', throwBack: 'BACK TO THE WEEDS.',
    }),
    normalScript('bass', 'regular', 'bass_regular_dock_edge', {
      tease: '', bite: 'THERE WE GO.', reel: '', emerge: 'A LITTLE BASS.',
      holdStart: 'NOT A FUSSY EATER.', holdEnd: '', throwBack: 'BACK UNDER THE PLANKS.',
    }),
    normalScript('bass', 'large', 'bass_large_supper_weight', {
      tease: '', bite: 'FISH ON.', reel: '', emerge: 'BIG BASS.',
      holdStart: 'TWO POUNDS IN HAND.', holdEnd: 'FOUR BY SUPPER.', throwBack: 'BACK IN YOU GO.',
    }),
    normalScript('bass', 'large', 'bass_large_scale_at_home', {
      tease: '', bite: 'GOT ONE.', reel: '', emerge: 'A GOOD BASS.',
      holdStart: 'NO SCALE.', holdEnd: 'PROBABLY FOR THE BEST.', throwBack: 'BEFORE I ROUND UP.',
    }),

    normalScript('walleye', 'regular', 'walleye_regular_soft_pickup', {
      tease: '', bite: 'THERE.', reel: '', emerge: 'A WALLEYE.',
      holdStart: 'EYES LIKE LANTERNS.', holdEnd: 'STILL TOOK THE BAIT.', throwBack: 'BACK TO THE DROP-OFF.',
    }),
    normalScript('walleye', 'regular', 'walleye_regular_dusk_edge', {
      tease: 'A TAP.', bite: 'THERE WE GO.', reel: '', emerge: 'WALLEYE.',
      holdStart: 'JUST ENOUGH LIGHT.', holdEnd: '', throwBack: 'OFF YOU GO.',
    }),
    normalScript('walleye', 'large', 'walleye_large_net_at_home', {
      tease: '', bite: 'FISH ON.', reel: '', emerge: 'BIG WALLEYE.',
      holdStart: "NET'S BACK AT THE HOUSE.", holdEnd: 'NATURALLY.', throwBack: 'BACK TO THE DEEP EDGE.',
    }),
    normalScript('walleye', 'large', 'walleye_large_lantern_eyes', {
      tease: '', bite: 'GOT ONE.', reel: '', emerge: 'WALLEYE. A GOOD ONE.',
      holdStart: "THAT'S DINNER.", holdEnd: 'FOR SOMEONE ELSE.', throwBack: 'STAY OUT OF TROUBLE.',
    }),

    normalScript('perch', 'regular', 'perch_regular_more_fight', {
      tease: '', bite: 'THERE.', reel: '', emerge: 'A PERCH.',
      holdStart: 'MORE FIGHT THAN FISH.', holdEnd: '', throwBack: 'BACK TO THE REEDS.',
    }),
    normalScript('perch', 'regular', 'perch_regular_full_temper', {
      tease: '', bite: 'GOT ONE.', reel: '', emerge: 'YELLOW PERCH.',
      holdStart: 'SMALL FISH.', holdEnd: 'FULL-SIZED TEMPER.', throwBack: 'OFF WITH YOU.',
    }),
    normalScript('perch', 'large', 'perch_large_bucket_at_home', {
      tease: '', bite: 'FISH ON.', reel: '', emerge: 'A BIG PERCH.',
      holdStart: 'KEEPER.', holdEnd: 'WRONG DAY FOR IT.', throwBack: 'BACK BESIDE THE ROCKS.',
    }),
    normalScript('perch', 'large', 'perch_large_wide_stripes', {
      tease: 'A LITTLE NIBBLE.', bite: 'THERE WE GO.', reel: '', emerge: 'YELLOW PERCH.',
      holdStart: 'GOOD STRIPES.', holdEnd: '', throwBack: 'LEAVE SOME BAIT FOR ME.',
    }),

    normalScript('trout', 'regular', 'trout_regular_silver_turn', {
      tease: '', bite: 'THERE.', reel: '', emerge: 'TROUT.',
      holdStart: 'A LITTLE SILVER.', holdEnd: '', throwBack: 'BACK TO THE COLD WATER.',
    }),
    normalScript('trout', 'regular', 'trout_regular_escape_plan', {
      tease: '', bite: 'GOT ONE.', reel: '', emerge: 'A TROUT.',
      holdStart: 'YOU CAN GO, THEN.', holdEnd: '', throwBack: 'BACK TO THE COOL CHANNEL.',
    }),
    normalScript('trout', 'large', 'trout_large_old_line', {
      tease: 'HANG ON.', bite: 'FISH ON.', reel: '', emerge: 'HEAVY TROUT.',
      holdStart: "THAT'LL DO.", holdEnd: '', throwBack: 'BACK TO THE DEEP COLD.',
    }),
    normalScript('trout', 'large', 'trout_large_rough_manners', {
      tease: '', bite: 'THERE WE GO.', reel: '', emerge: 'SPECKLED TROUT.',
      holdStart: 'FINE SPOTS.', holdEnd: 'ROUGH MANNERS.', throwBack: 'BACK WITH YOU.',
    }),

    normalScript('bluegill', 'regular', 'bluegill_regular_little_tap', {
      tease: '', bite: 'GOT ONE.', reel: '', emerge: 'BLUEGILL.',
      holdStart: "THAT'S A LOT OF ATTITUDE.", holdEnd: '', throwBack: 'BACK UNDER THE DOCK.',
    }),
    normalScript('bluegill', 'regular', 'bluegill_regular_broadside', {
      tease: '', bite: 'THERE.', reel: '', emerge: 'A BLUEGILL.',
      holdStart: 'WIDE AS A PANCAKE.', holdEnd: 'NOT MUCH LONGER.', throwBack: 'BACK TO THE SHALLOWS.',
    }),
    normalScript('bluegill', 'large', 'bluegill_large_fills_a_hand', {
      tease: '', bite: 'FISH ON.', reel: '', emerge: 'BIG BLUEGILL.',
      holdStart: "THINKS HE'S A MUSKY.", holdEnd: '', throwBack: 'BACK TO THE DOCK SHADE.',
    }),
    normalScript('bluegill', 'large', 'bluegill_large_frying_pan', {
      tease: 'THERE.', bite: 'GOT ONE.', reel: '', emerge: 'A BROAD BLUEGILL.',
      holdStart: 'NEARLY ROUND.', holdEnd: '', throwBack: 'BACK TO THE QUIET WATER.',
    }),

    normalScript('musky', 'regular', 'musky_regular_ten_thousand_casts', {
      tease: '', bite: 'FISH ON.', reel: '', emerge: 'MUSKY.',
      holdStart: 'RIGHT OFF THE DOCK.', holdEnd: '', throwBack: 'BACK TO THE WEED LINE.',
    }),
    normalScript('musky', 'regular', 'musky_regular_moving_log', {
      tease: '', bite: 'STEADY.', reel: '', emerge: "THAT'S A MUSKY.",
      holdStart: 'MOSTLY TEETH.', holdEnd: '', throwBack: 'GO SCARE THE WALLEYE.',
    }),
    normalScript('musky', 'large', 'musky_large_dog_witness', {
      tease: '', bite: 'EASY.', reel: '', emerge: 'BIG MUSKY.',
      holdStart: "THAT'S ONE TO REMEMBER.", holdEnd: '', throwBack: 'BACK BEFORE I ADD A FOOT.',
    }),
    normalScript('musky', 'large', 'musky_large_forgot_camera', {
      tease: '', bite: 'FISH ON.', reel: '', emerge: 'A BIG OLD MUSKY.',
      holdStart: 'NO CAMERA.', holdEnd: "YOU'LL HAVE TO TRUST ME.", throwBack: 'GO BEND ANOTHER ROD.',
    }),
  ],
  weeds: [outcomeScript('fishing_not_catching', {
    tease: 'THAT FELT PROMISING.', bite: 'GOT SOMETHING.', reel: 'HEAVY. NOT FIGHTING.', emerge: 'FINE CROP OF WEEDS.',
    holdStart: "IT'S CALLED FISHING.", holdEnd: 'NOT CATCHING FISH.', throwBack: 'RIGHT WHERE I FOUND THEM.',
  })],
  stolen_bait: [outcomeScript('bait_thief', {
    tease: 'LITTLE TAP.', bite: 'THAT WAS A BITE.', reel: 'TOO LIGHT.', emerge: "BAIT'S GONE.",
    holdStart: 'TOOK SUPPER.', holdEnd: 'LEFT THE HOOK.', throwBack: '',
  })],
  no_bite: [outcomeScript('lake_quiet', {
    tease: 'JUST THE WIND.', bite: '', reel: 'NOTHING DOING.', emerge: '',
    holdStart: "LAKE'S KEEPING QUIET.", holdEnd: "ONE MORE CAST WON'T HURT.", throwBack: '',
  })],
};
