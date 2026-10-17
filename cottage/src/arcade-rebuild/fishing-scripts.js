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
      tease: 'THAT WAS A CLEAN TAP.', bite: 'BASS ON!', reel: 'KEEP HIM OUT OF THE WEEDS.', emerge: 'GOOD LITTLE BASS.',
      holdStart: 'ALL MOUTH.', holdEnd: 'ATE FIRST. AS USUAL.', throwBack: 'GO FIND YOUR WEED BED.',
    }),
    normalScript('bass', 'regular', 'bass_regular_dock_edge', {
      tease: 'MOVED BELOW THE DOCK.', bite: 'GOT HIM OFF THE EDGE!', reel: 'CLEAR OF THE DOCK POSTS.', emerge: 'DOCK-SIDE BASS.',
      holdStart: 'SAW THE BAIT COMING.', holdEnd: 'ATE IT ANYWAY.', throwBack: 'BACK UNDER THE PLANKS.',
    }),
    normalScript('bass', 'large', 'bass_large_supper_weight', {
      tease: 'THAT WAS A PROPER TAP.', bite: 'BIG STRIKE!', reel: 'EASY ON THE DRAG.', emerge: 'HEAVY BASS.',
      holdStart: 'TWO POUNDS IN HAND.', holdEnd: 'FOUR BY SUPPER.', throwBack: 'GO MAKE A LIAR OF ME.',
    }),
    normalScript('bass', 'large', 'bass_large_scale_at_home', {
      tease: 'HE TOUCHED IT ONCE.', bite: 'NOW HE MEANS IT!', reel: 'KEEP HIS HEAD UP.', emerge: 'THAT IS A WIDE BASS.',
      holdStart: 'THAT ONE NEEDS A SCALE.', holdEnd: "SHAME IT'S AT HOME.", throwBack: 'BACK BEFORE I GUESS.',
    }),

    normalScript('walleye', 'regular', 'walleye_regular_soft_pickup', {
      tease: 'SOFT LITTLE PICKUP.', bite: 'WALLEYE ON!', reel: 'LOW AND STEADY.', emerge: 'GOOD WALLEYE.',
      holdStart: 'EYES LIKE LANTERNS.', holdEnd: 'NEVER SAW THE HOOK.', throwBack: 'BACK TO THE DROP-OFF.',
    }),
    normalScript('walleye', 'regular', 'walleye_regular_dusk_edge', {
      tease: 'THE LINE JUST TIGHTENED.', bite: 'THERE HE IS!', reel: 'DO NOT GIVE HIM SLACK.', emerge: 'GOLDEN WALLEYE.',
      holdStart: 'PICKED THE RIGHT HOUR.', holdEnd: 'AND THE WRONG BAIT.', throwBack: 'BELOW THE LAST LIGHT.',
    }),
    normalScript('walleye', 'large', 'walleye_large_net_at_home', {
      tease: 'THAT WAS NO PERCH.', bite: 'BIG WALLEYE ON!', reel: 'KEEP HER DOWN.', emerge: 'THICK WALLEYE.',
      holdStart: 'THE NET WOULD HAVE HELPED.', holdEnd: "GOOD THING IT'S AT HOME.", throwBack: 'BACK TO THE DEEP EDGE.',
    }),
    normalScript('walleye', 'large', 'walleye_large_lantern_eyes', {
      tease: 'BARELY FELT THAT.', bite: 'HEAVY FISH!', reel: 'PATIENCE. KEEP IT LOW.', emerge: 'BIG GOLDEN WALLEYE.',
      holdStart: 'EYES LIKE SAUCERS.', holdEnd: 'ATE HALF THE LAKE.', throwBack: 'GO REST ON THE BOTTOM.',
    }),

    normalScript('perch', 'regular', 'perch_regular_more_fight', {
      tease: 'QUICK LITTLE PECK.', bite: 'PERCH ON!', reel: 'MORE FIGHT THAN WEIGHT.', emerge: 'YELLOW PERCH.',
      holdStart: 'STRIPES ARE SHARP.', holdEnd: 'TEMPER IS SHARPER.', throwBack: 'BACK TO THE REEDS.',
    }),
    normalScript('perch', 'regular', 'perch_regular_full_temper', {
      tease: 'TINY RATTLE.', bite: 'GOT A PERCH!', reel: 'LIGHT LINE. HARD PULL.', emerge: 'FEISTY PERCH.',
      holdStart: 'SMALL FISH.', holdEnd: 'FULL-SIZED TEMPER.', throwBack: 'GO ARGUE WITH THE REEDS.',
    }),
    normalScript('perch', 'large', 'perch_large_bucket_at_home', {
      tease: 'SHARP LITTLE TAP.', bite: 'BIG PERCH ON!', reel: 'KEEP THAT ROD BENT.', emerge: 'KEEPER-SIZED PERCH.',
      holdStart: 'THAT ONE FILLS A HAND.', holdEnd: "BUCKET'S BACK AT THE HOUSE.", throwBack: 'BACK BESIDE THE ROCKS.',
    }),
    normalScript('perch', 'large', 'perch_large_wide_stripes', {
      tease: 'HARD TAP FOR A PERCH.', bite: 'STRIPES ON!', reel: 'HE TURNED SIDEWAYS.', emerge: 'BROAD YELLOW PERCH.',
      holdStart: 'THOSE STRIPES GOT WIDE.', holdEnd: 'EATING ALL MY BAIT.', throwBack: 'SAVE ME SOME BAIT.',
    }),

    normalScript('trout', 'regular', 'trout_regular_silver_turn', {
      tease: 'SOFT AS A FEATHER.', bite: 'SILVER FLASH!', reel: 'LET HER RUN.', emerge: 'GOOD TROUT.',
      holdStart: 'CLEAN SILVER TURN.', holdEnd: 'COLD-WATER FISH.', throwBack: 'BACK TO THE COOL CHANNEL.',
    }),
    normalScript('trout', 'regular', 'trout_regular_escape_plan', {
      tease: 'THAT WAS DELICATE.', bite: 'TROUT TOOK IT!', reel: 'EASY ON THE LINE.', emerge: 'SPECKLED TROUT.',
      holdStart: 'PLANNING AN ESCAPE.', holdEnd: 'SAVES ME THE TROUBLE.', throwBack: "SHOW ME HOW IT'S DONE.",
    }),
    normalScript('trout', 'large', 'trout_large_old_line', {
      tease: 'LINE WENT LIGHT.', bite: "NOW IT'S RUNNING!", reel: 'THAT LINE IS OLD.', emerge: 'HEAVY TROUT.',
      holdStart: 'USED THE WHOLE REEL.', holdEnd: 'NEARLY KEPT THE HANDLE.', throwBack: 'BACK TO THE DEEP COLD.',
    }),
    normalScript('trout', 'large', 'trout_large_rough_manners', {
      tease: 'QUIET LITTLE TOUCH.', bite: 'BIG TROUT ON!', reel: 'KEEP THE LINE TIGHT.', emerge: 'BEAUTIFUL BIG TROUT.',
      holdStart: 'FINE SPOTS.', holdEnd: 'ROUGH MANNERS.', throwBack: 'KEEP THE SPOTS.',
    }),

    normalScript('bluegill', 'regular', 'bluegill_regular_little_tap', {
      tease: 'LITTLE TAP.', bite: 'BLUEGILL ON!', reel: 'STUBBORN LITTLE FISH.', emerge: "THERE'S A BLUEGILL.",
      holdStart: 'MORE REEL THAN FISH.', holdEnd: 'STILL PULLED HARD.', throwBack: 'BACK UNDER THE DOCK.',
    }),
    normalScript('bluegill', 'regular', 'bluegill_regular_broadside', {
      tease: 'QUICK NIBBLE.', bite: 'GOT A BLUEGILL!', reel: 'HE TURNED BROADSIDE.', emerge: 'WIDE LITTLE FISH.',
      holdStart: 'WIDE AS A PANCAKE.', holdEnd: 'NOT MUCH LONGER.', throwBack: 'BACK TO THE SHALLOWS.',
    }),
    normalScript('bluegill', 'large', 'bluegill_large_fills_a_hand', {
      tease: 'THAT BOBBER MOVED.', bite: 'BIG BLUEGILL!', reel: 'KEEP HIM OFF THE POSTS.', emerge: 'THICK BLUEGILL.',
      holdStart: 'FILLS THE WHOLE HAND.', holdEnd: "THINKS HE'S A MUSKY.", throwBack: 'BACK TO THE DOCK SHADE.',
    }),
    normalScript('bluegill', 'large', 'bluegill_large_frying_pan', {
      tease: 'BOBBER LEFT IN A HURRY.', bite: 'THAT ONE HAS SHOULDERS!', reel: 'KEEP HIM TURNED.', emerge: 'GOOD BIG BLUEGILL.',
      holdStart: 'WIDE AS THE FRYING PAN.', holdEnd: 'LUCKY FOR HIM, WE ATE.', throwBack: 'BACK TO THE QUIET WATER.',
    }),

    normalScript('musky', 'regular', 'musky_regular_ten_thousand_casts', {
      tease: 'THAT WAS NOT A NIBBLE.', bite: 'MUSKY! HOLD ON!', reel: 'KEEP THE DRAG WORKING.', emerge: 'A PROPER MUSKY.',
      holdStart: 'TEN THOUSAND CASTS.', holdEnd: 'ONE BAD DECISION.', throwBack: 'BACK TO THE WEED LINE.',
    }),
    normalScript('musky', 'regular', 'musky_regular_moving_log', {
      tease: 'FELT LIKE A LOG.', bite: 'THE LOG IS MOVING!', reel: 'DO NOT LET IT TURN.', emerge: 'SOLID MUSKY.',
      holdStart: 'MOSTLY TEETH.', holdEnd: 'THE REST IS BAD INTENT.', throwBack: 'GO SCARE THE WALLEYE.',
    }),
    normalScript('musky', 'large', 'musky_large_dog_witness', {
      tease: 'SOMETHING BIG MOVED.', bite: "THAT'S A MUSKY!", reel: 'STEADY. KEEP HER COMING.', emerge: 'THAT IS A LOT OF MUSKY.',
      holdStart: 'NO ONE WILL BELIEVE THIS.', holdEnd: 'DOG MIGHT. HE WAS HERE.', throwBack: 'BACK BEFORE I ADD A FOOT.',
    }),
    normalScript('musky', 'large', 'musky_large_forgot_camera', {
      tease: 'BOBBER JUST VANISHED.', bite: 'FISH ON!', reel: 'LET THE DRAG DO THE WORK.', emerge: 'BIG OLD MUSKY.',
      holdStart: 'NO CAMERA. OF COURSE.', holdEnd: "GOOD THING I DIDN'T.", throwBack: 'GO BEND ANOTHER ROD.',
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
