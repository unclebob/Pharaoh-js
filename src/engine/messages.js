'use strict';

const { pick, randomInt } = require('./random');

const openingMessages = [
  "Welcome to the game of Pharaoh.",
  "Oh great and powerful Pharaoh, welcome to thy domain.",
  "The game of Pharaoh is about to begin.",
  "Hear ye one, and hear ye all. Here begineth the game of Pharaoh.",
  "Now begins the greatest of all games. The king has taken his seat. The Game of Pharaoh is about to begin.",
  "Blessed art thou oh great and dread lord. Hail thee Pharaoh, king of all the realm.",
  "Prepare yourself for the greatest of all games. You are about to play,,,,, Pharaoh.",
  "Mere mortal, dare you to attempt to play the game of games? Then ready yourself. Pharaoh is about to begin.",
  "How high can you build your pyramid in 20 years?",
  "Many have tried, but few have succeeded. Try if you will, but beware. Such matters are the domain of kings, and not meant for the hands of mere mortal men.",
  "Well, glad you could make it. This is the game of Pharaoh. Sit down. Relax. And prepare yourself. It begins.",
  "Congratulations. You have just started up the game of Pharaoh. Now prepare yourself for battle in the world of ancient gods.",
  "Are you prepared to match wits with the kings of old? Ancient ones who have learned great mysteries. Fare ye well, for luck you will surely need.",
  "It takes great courage to do what you have done. But now you must face up to your decision. The test of pharaoh is upon you.",
  "Can you withstand the test of kings, and the trial of power. Power is given to you, a land to rule. Rule it wisely and build a powerful nation. Then, if you dare, erect a monument to challenge the gods themselves.",
  "Come into my kingdom young one. I give thee the staff of law and the crown of power. Decide wisely your course of action. You are now,,,,,,,,,,,, pharaoh.",
  "So, you would like to be a king eh? Well, let's see if you can really cut it.",
  "Those who aspire to be kings must pay the price of decision, and pass the test of knowledge. You have dared, so now the trial begins.",
  "If you want to hear something clever, start the game over. I'm tired of coming up with new sayings all the time.",
  "You dare to present yourself as one who could rule? You miserable weakling, do you think that you could decide between life and death for a nation? Since you have been so presumptuous, your wish is granted. Go forth and be,,,,,, pharaoh.",
  "Good luck, you're going to need it.",
  "Consider well your course. You have challenged the gods to make you a king. So be it. King you are. But beware, it's not as easy as you think.",
  "oooooooo oooo oo oooo oooo o o o Gods of power, gods of strength. Show this fool that not just anyone can be a king.",
  "The deed is done, the time has come. You pretend to be the one. To rule the land you now must try, but if you fail, then you must die. Good luck.",
  "Fire and plague, pestilence and famine. Wars and droughts and rebellion and strife. These are the payment for those who would be king.",
  "How good are you at handling riots? Do you know how much an ox eats each month? How much fertilizer does an acre of land require? How many soldiers do you need to protect your land? Well, you are going to find out.",
  "The time has come, the hour is near, and even though you shake with fear, you must press on and find the path, gee you smell, please take a bath.",
  "You look familiar, haven't we met before?",
  "One day, you might just win this game. Maybe today."
];

const winMessages = [
  "Your pyramid is complete! Strike up the band.",
  "The gods smile upon your monument. It is finished!",
  "Behold! Your pyramid touches the sky!",
  "A marvel of the ancient world stands before you!",
  "The slaves rejoice! The pyramid is done!",
  "Generations will gaze upon your creation in wonder.",
  "You have built a monument to rival the gods themselves!",
  "The pharaoh's dream is realized. The pyramid is complete!",
  "History will remember this pyramid, and the pharaoh who built it.",
  "From the desert sands rises your eternal monument!"
];

const farewellMessages = [
  "Farewell, great Pharaoh. May your reign be eternal.",
  "Go in peace, mighty ruler. Your legacy is assured.",
  "The gods grant you safe passage to the afterlife.",
  "Until we meet again in the land beyond the stars.",
  "Your name shall be spoken for a thousand years."
];

const pyramidErrorMessages = [
  "Stone dust has gotten into your fingers.",
  "The scribes cannot read your writing.",
  "Even the slaves are confused by that number.",
  "The architects shake their heads in bewilderment.",
  "Perhaps you should try using actual numbers, great Pharaoh."
];

const negativePyramidErrorMessages = [
  "Negative stones? Ah you want me to remove stones!",
  "We cannot un-build the pyramid, oh Pharaoh.",
  "The slaves refuse to carry stones downhill.",
  "Removing stones would anger the gods!",
  "A negative pyramid? That would be a hole in the ground!"
];

const feedRateErrorMessages = [
  "Feed rates are odd things. They have to be numeric.",
  "The scribes cannot interpret that as a number, great Pharaoh.",
  "Even the oxen know that is not a valid number.",
  "Numbers, oh Pharaoh. The feed rate must be a number.",
  "The horses whinny in confusion. Please enter a proper number."
];

function getOpeningMessage(rng) {
  const face = randomInt(rng, 0, 4);
  const text = pick(rng, openingMessages);
  return { face, text };
}

function getWinMessage(rng) {
  return pick(rng, winMessages);
}

function getFarewellMessage(rng) {
  return pick(rng, farewellMessages);
}

function getPyramidErrorMessage(rng) {
  return pick(rng, pyramidErrorMessages);
}

function getNegativePyramidErrorMessage(rng) {
  return pick(rng, negativePyramidErrorMessages);
}

function getFeedRateErrorMessage(rng) {
  return pick(rng, feedRateErrorMessages);
}

module.exports = {
  openingMessages, getOpeningMessage,
  winMessages, farewellMessages,
  pyramidErrorMessages, negativePyramidErrorMessages,
  feedRateErrorMessages, getFeedRateErrorMessage,
  getWinMessage, getFarewellMessage,
  getPyramidErrorMessage, getNegativePyramidErrorMessage
};
