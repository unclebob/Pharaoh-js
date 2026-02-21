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

const plantingErrorMessages = [
  "We are planting wheat, not alphabet soup.",
  "The scribes cannot decipher your planting orders.",
  "Even the seeds are confused by that input.",
  "Numbers, great Pharaoh. Acres must be a number.",
  "The farmers scratch their heads. Try a proper number."
];

const negativePlantingErrorMessages = [
  "Negative wheat. Grows down eh?",
  "We cannot un-plant what was never sown.",
  "Negative acres? The land does not work that way.",
  "The farmers refuse to plant in reverse.",
  "Unplanting is not a thing, oh Pharaoh."
];

const fertilizerErrorMessages = [
  "We are talking about fertilizer, measured in tons.",
  "The scribes cannot read your manure orders.",
  "Even the oxen know that is not a valid tonnage.",
  "Numbers, great Pharaoh. Manure is measured in tons.",
  "The farmers need a number for the fertilizer, not riddles."
];

const negativeFertilizerErrorMessages = [
  "Negative fertilizer? Hey, maybe that's food!",
  "We cannot un-spread the manure, oh Pharaoh.",
  "Negative manure? The fields would be confused.",
  "The farmers refuse to collect manure from the fields.",
  "Removing fertilizer is not how farming works."
];

const overseerMissedPayrollMessages = [
  "Your overseers have quit! They demand a %5.1f%% raise to return.",
  "No gold, no overseers. They want %5.1f%% more to come back.",
  "The overseers have abandoned their posts. A %5.1f%% raise might lure them back.",
  "Unpaid overseers are angry overseers. They demand %5.1f%% more pay.",
  "Your overseers want a %5.1f%% raise. You missed their payroll.",
  "The overseers refuse to work for free. They demand a %5.1f%% increase.",
  "All overseers have left! They will only return for %5.1f%% more gold.",
  "Missed payroll! The overseers demand %5.1f%% more to forgive you."
];

const overseerInputErrorMessages = [
  "Hire or fire. Hey, that rhymes!",
  "The overseer captain cannot understand your orders.",
  "Numbers, great Pharaoh. Overseers are counted in numbers.",
  "The scribes cannot interpret that as an overseer command.",
  "Even the overseers are confused by that input."
];

const overseerFractionalErrorMessages = [
  "That is likely to be a bloody operation.",
  "Half an overseer? That would be messy.",
  "We cannot split an overseer in two, great Pharaoh.",
  "Overseers come in whole numbers, not fractions.",
  "Fractional overseers? The physicians advise against it."
];

const overseerFireTooManyMessages = [
  "You cannot fire overseers you do not have.",
  "There are not that many overseers to dismiss.",
  "You would fire more than you employ? Impossible.",
  "The overseer captain reports insufficient men to dismiss.",
  "We do not have that many overseers, great Pharaoh."
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

function getPlantingErrorMessage(rng) {
  return pick(rng, plantingErrorMessages);
}

function getNegativePlantingErrorMessage(rng) {
  return pick(rng, negativePlantingErrorMessages);
}

function getFertilizerErrorMessage(rng) {
  return pick(rng, fertilizerErrorMessages);
}

function getNegativeFertilizerErrorMessage(rng) {
  return pick(rng, negativeFertilizerErrorMessages);
}

function getOverseerMissedPayrollMessage(rng, raisePercent) {
  const template = pick(rng, overseerMissedPayrollMessages);
  return template.replace('%5.1f%%', raisePercent.toFixed(1) + '%');
}

function getOverseerInputErrorMessage(rng) {
  return pick(rng, overseerInputErrorMessages);
}

function getOverseerFractionalErrorMessage(rng) {
  return pick(rng, overseerFractionalErrorMessages);
}

function getOverseerFireTooManyMessage(rng) {
  return pick(rng, overseerFireTooManyMessages);
}

const supplyLimitMessages = [
  "I am afraid I can't accept any more than %.0f.",
  "The market is glutted! I can only take %.0f at most.",
  "My warehouses are bursting. %.0f is the absolute maximum.",
  "Supply exceeds demand. I'll buy no more than %.0f.",
  "The traders refuse more than %.0f units. The market is saturated.",
  "Too much on the market already. %.0f is all I can absorb.",
  "I would be a fool to accept more than %.0f.",
  "My storerooms can handle %.0f and not a single unit more.",
  "The merchants' guild limits me to %.0f.",
  "Alas, the demand allows me to accept only %.0f."
];

const demandLimitMessages = [
  "I am afraid that I can only spare %.0f.",
  "There are only %.0f available in the market.",
  "My supplies are running low. I have just %.0f left.",
  "The warehouses hold only %.0f. Take it or leave it.",
  "You ask for too much! I have but %.0f to sell.",
  "The caravans brought only %.0f this season.",
  "Supplies are scarce. %.0f is all there is.",
  "The market can only provide %.0f right now.",
  "After the last drought, only %.0f remain in stock.",
  "I wish I had more, but %.0f is all I can offer."
];

const transactionSuccessMessages = [
  "Thank you for buying my quality merchandise.",
  "A fine transaction! May it bring you prosperity.",
  "The deal is done. Pleasure doing business with you.",
  "Excellent! The goods are yours, great Pharaoh.",
  "A wise purchase. The gods smile on this trade.",
  "Done and done! May your granaries overflow.",
  "The merchants bow. The transaction is complete.",
  "A fair deal for both sides. Until next time!",
  "The scribes have recorded the transaction.",
  "May this trade bring fortune to your kingdom."
];

const insufficientFundsMessages = [
  "You only have the cash for %.0f.",
  "Your coffers are too light! You can afford only %.0f.",
  "The treasury is insufficient. Maximum purchase: %.0f.",
  "Your gold runs short. You can buy no more than %.0f.",
  "The banker shakes his head. You can afford %.0f at best.",
  "Not enough gold, great Pharaoh. You may buy up to %.0f.",
  "Your purse is too thin for that. Maximum: %.0f.",
  "The merchants demand payment. You can only cover %.0f.",
  "Alas, your wealth allows for only %.0f.",
  "The scribes report insufficient funds. Maximum affordable: %.0f."
];

const sellMoreThanOwnedMessages = [
  "You only have %f to sell.",
  "Your stores hold just %f. You cannot sell what you do not own.",
  "The scribes report you possess merely %f.",
  "You cannot sell more than the %f you have.",
  "Impossible! Your inventory shows only %f."
];

const tradingInputErrorMessages = [
  "The scribes cannot make sense of your trading orders.",
  "Buy or sell, great Pharaoh, but use numbers please!",
  "The merchants are confused by your gibberish.",
  "That is not a valid trading command.",
  "Numbers! The market deals in numbers, not riddles.",
  "The traders scratch their heads at your request.",
  "Even the camels look confused by that input.",
  "Please enter a proper amount for the trade.",
  "The market does not accept hieroglyphic nonsense.",
  "Try again with an actual number, oh great Pharaoh."
];

const noFunctionSelectedMessages = [
  "You must choose to buy or sell first.",
  "Select a trading action before entering amounts.",
  "The merchants await your decision: buy or sell?",
  "No action selected. What would you like to do?",
  "First decide whether to buy or sell, great Pharaoh."
];

// ── Loan Messages (Appendix A.10) ──

const creditCheckFeeMessages = [
  "It will cost you %.0f to find out if you qualify.",
  "A credit investigation will run you %.0f gold.",
  "The banker requires %.0f gold to check your credit.",
  "For a mere %.0f gold, we can check your standing.",
  "Credit check fee: %.0f gold. Take it or leave it.",
  "The scribes demand %.0f gold to review your finances.",
  "A thorough financial review costs %.0f gold.",
  "The bank charges %.0f gold for a credit assessment.",
  "It takes %.0f gold to grease the wheels of banking.",
  "For %.0f gold, I can look into your creditworthiness.",
  "The fee for a credit evaluation is %.0f gold.",
  "My accountants charge %.0f gold for their services.",
  "A small fee of %.0f gold to check the books.",
  "The bank requires a deposit of %.0f gold for the review.",
  "Pay %.0f gold and we shall see what you can borrow."
];

const loanApprovalMessages = [
  "Congratulations! You have been approved for %.0f gold at %.2f%% interest.",
  "The bank grants you %.0f gold. Interest rate: %.2f%%.",
  "Your loan of %.0f gold is approved. Do try to pay it back. Interest: %.2f%%.",
  "Here is your %.0f gold. Remember, %.2f%% interest applies.",
  "The banker smiles. %.0f gold at %.2f%% interest is yours.",
  "Approved! %.0f gold, %.2f%% interest. Try not to spend it all at once.",
  "The coffers open. %.0f gold flows your way at %.2f%% interest.",
  "Your credit is good for %.0f gold. Interest: %.2f%%.",
  "The bank reluctantly parts with %.0f gold at %.2f%% interest.",
  "Loan granted: %.0f gold, %.2f%% per month. Good luck.",
  "The scribes approve your %.0f gold loan at %.2f%%.",
  "Take your %.0f gold and spend wisely. Interest: %.2f%%.",
  "The vault opens for %.0f gold. Monthly rate: %.2f%%.",
  "You may borrow %.0f gold at the rate of %.2f%%.",
  "Done! %.0f gold at %.2f%%. The banker expects prompt repayment."
];

const loanDenialMessages = [
  "Your credit is not sufficient. The loan is denied.",
  "The bank laughs at your request. Denied!",
  "Not a chance. Your finances are a disaster.",
  "The banker shakes his head. No loan for you.",
  "Denied! Perhaps try living within your means.",
  "Your credit rating is abysmal. Request denied.",
  "The bank has standards, and you do not meet them.",
  "Ha! You want to borrow? With YOUR credit? Denied.",
  "The scribes have reviewed your request. The answer is no.",
  "Not even the most desperate moneylender would fund you.",
  "Denied. The bank suggests you sell some assets.",
  "Your net worth does not support this loan. Denied.",
  "The banker politely declines. Actually, not politely.",
  "No. Just no. Your financial situation is dire.",
  "The bank vault remains firmly closed to you."
];

const loanRepaymentMessages = [
  "The debt is paid! You are free at last.",
  "Payment received. The banker nods approvingly.",
  "Your loan is repaid in full. Well done!",
  "The scribes mark your debt as settled.",
  "Freedom from debt! The banker bids you farewell.",
  "Paid in full. The bank thanks you for your business.",
  "Your account is clear. The banker smiles."
];

const loanRepaymentSignoffMessages = [
  "May your future be free of debt.",
  "Go forth and prosper, debt-free one.",
  "The gods reward those who honor their debts.",
  "Until next time you need our services.",
  "A clean slate is a beautiful thing.",
  "Now try to keep it that way.",
  "The banker waves goodbye to a good customer.",
  "May you never darken these doors again."
];

const cashShortageMessages = [
  "You have run out of cash!",
  "Your treasury is empty! This is a crisis.",
  "No gold remains in your coffers.",
  "The treasury is bare. You are broke.",
  "Your gold has run out. Desperate times ahead.",
  "Not a single gold piece remains. Emergency!",
  "The coffers echo with emptiness.",
  "You are flat broke. The bankers are circling.",
  "Gold? What gold? You have none.",
  "Financial ruin stares you in the face."
];

const foreclosureMessages = [
  "The bank forecloses! Your kingdom is seized.",
  "Foreclosure! The bankers take everything.",
  "Your debts have consumed your kingdom. Game over.",
  "The bank has foreclosed on your assets. You are ruined.",
  "Foreclosure! The moneylenders claim your throne.",
  "Your kingdom is forfeit. The bank takes all.",
  "The bankers arrive with armed guards. Foreclosure!",
  "Debt has destroyed your reign. The bank forecloses.",
  "The scribes seal the foreclosure notice. It is over.",
  "Your empire crumbles under the weight of debt.",
  "The bank seizes your lands, your slaves, everything.",
  "Foreclosure complete. You are cast out.",
  "The moneylenders have won. Your kingdom falls.",
  "Debt is the destroyer of kings. You are foreclosed.",
  "The bank takes possession. Your reign ends here."
];

const bankruptcyMessages = [
  "The party's over.",
  "Bankruptcy! You cannot even afford an emergency loan.",
  "Total financial ruin. There is no way out.",
  "You are bankrupt. The game is over.",
  "Not even the most desperate lender will help you now.",
  "Bankruptcy declared. Your reign ends in disgrace.",
  "You have nothing left. The kingdom falls.",
  "The coffers are empty and no one will lend to you.",
  "Bankrupt! The gods turn their backs on you.",
  "Financial oblivion. There is no recovery from this."
];

const foreclosureWarningMessages = [
  "The banker warns: your debt ratio is dangerously high.",
  "Warning! You are approaching foreclosure territory.",
  "The bank is watching your debt levels closely.",
  "Careful! Your debt-to-asset ratio concerns the bank.",
  "The moneylenders are sharpening their quills. Beware.",
  "A warning from the bank: reduce your debt or face consequences.",
  "Your financial situation is precarious. The bank is nervous.",
  "The bankers whisper among themselves about your debts.",
  "Debt warning: you are nearing the foreclosure threshold.",
  "The bank sends a stern reminder about your obligations.",
  "Your credit standing is deteriorating rapidly.",
  "The banker frowns at your balance sheet. A warning.",
  "Reduce your debt now or face foreclosure.",
  "The bank issues a formal warning about your debt levels.",
  "You are skating on thin financial ice."
];

const loanInputErrorMessages = [
  "This is a bank. We do things right. Now you try.",
  "The banker cannot read your writing. Try numbers.",
  "Gold is measured in numbers, not hieroglyphics.",
  "The scribes at the bank demand proper numbers.",
  "Invalid input. The bank only deals in numbers."
];

const loanNoFunctionSelectedMessages = [
  "Would you like to borrow or repay?",
  "The banker waits. Borrow or repay?",
  "Choose an action: borrow or repay.",
  "The bank offers borrowing and repayment. Pick one.",
  "Select borrow or repay before entering an amount."
];

const loanInsufficientRepaymentMessages = [
  "You do not have enough gold to make that repayment.",
  "Your coffers are too light for that payment.",
  "Insufficient funds for repayment.",
  "You cannot repay more than you possess.",
  "The banker points to your empty purse. Not enough."
];

function getSupplyLimitMessage(rng, amount) {
  const template = pick(rng, supplyLimitMessages);
  return template.replace('%.0f', Math.floor(amount).toString());
}

function getDemandLimitMessage(rng, amount) {
  const template = pick(rng, demandLimitMessages);
  return template.replace('%.0f', Math.floor(amount).toString());
}

function getTransactionSuccessMessage(rng) {
  return pick(rng, transactionSuccessMessages);
}

function getInsufficientFundsMessage(rng, maxAffordable) {
  const template = pick(rng, insufficientFundsMessages);
  return template.replace('%.0f', Math.floor(maxAffordable).toString());
}

function getSellMoreThanOwnedMessage(rng, owned) {
  const template = pick(rng, sellMoreThanOwnedMessages);
  return template.replace('%f', owned.toString());
}

function getTradingInputErrorMessage(rng) {
  return pick(rng, tradingInputErrorMessages);
}

function getNoFunctionSelectedMessage(rng) {
  return pick(rng, noFunctionSelectedMessages);
}

function getCreditCheckFeeMessage(rng, fee) {
  const template = pick(rng, creditCheckFeeMessages);
  return template.replace('%.0f', Math.floor(fee).toString());
}

function getLoanApprovalMessage(rng, amount, rate) {
  const template = pick(rng, loanApprovalMessages);
  return template.replace('%.0f', Math.floor(amount).toString())
    .replace('%.2f%%', rate.toFixed(2) + '%');
}

function getLoanDenialMessage(rng) {
  return pick(rng, loanDenialMessages);
}

function getLoanRepaymentMessage(rng) {
  const msg = pick(rng, loanRepaymentMessages);
  const signoff = pick(rng, loanRepaymentSignoffMessages);
  return msg + ' ' + signoff;
}

function getCashShortageMessage(rng) {
  return pick(rng, cashShortageMessages);
}

function getForeclosureMessage(rng) {
  return pick(rng, foreclosureMessages);
}

function getBankruptcyMessage(rng) {
  return pick(rng, bankruptcyMessages);
}

function getForeclosureWarningMessage(rng) {
  return pick(rng, foreclosureWarningMessages);
}

function getLoanInputErrorMessage(rng) {
  return pick(rng, loanInputErrorMessages);
}

function getLoanNoFunctionSelectedMessage(rng) {
  return pick(rng, loanNoFunctionSelectedMessages);
}

function getLoanInsufficientRepaymentMessage(rng) {
  return pick(rng, loanInsufficientRepaymentMessages);
}

module.exports = {
  openingMessages, getOpeningMessage,
  winMessages, farewellMessages,
  pyramidErrorMessages, negativePyramidErrorMessages,
  feedRateErrorMessages, getFeedRateErrorMessage,
  plantingErrorMessages, getPlantingErrorMessage,
  negativePlantingErrorMessages, getNegativePlantingErrorMessage,
  fertilizerErrorMessages, getFertilizerErrorMessage,
  negativeFertilizerErrorMessages, getNegativeFertilizerErrorMessage,
  overseerMissedPayrollMessages, getOverseerMissedPayrollMessage,
  overseerInputErrorMessages, getOverseerInputErrorMessage,
  overseerFractionalErrorMessages, getOverseerFractionalErrorMessage,
  overseerFireTooManyMessages, getOverseerFireTooManyMessage,
  getWinMessage, getFarewellMessage,
  getPyramidErrorMessage, getNegativePyramidErrorMessage,
  supplyLimitMessages, getSupplyLimitMessage,
  demandLimitMessages, getDemandLimitMessage,
  transactionSuccessMessages, getTransactionSuccessMessage,
  insufficientFundsMessages, getInsufficientFundsMessage,
  sellMoreThanOwnedMessages, getSellMoreThanOwnedMessage,
  tradingInputErrorMessages, getTradingInputErrorMessage,
  noFunctionSelectedMessages, getNoFunctionSelectedMessage,
  creditCheckFeeMessages, getCreditCheckFeeMessage,
  loanApprovalMessages, getLoanApprovalMessage,
  loanDenialMessages, getLoanDenialMessage,
  loanRepaymentMessages, loanRepaymentSignoffMessages, getLoanRepaymentMessage,
  cashShortageMessages, getCashShortageMessage,
  foreclosureMessages, getForeclosureMessage,
  bankruptcyMessages, getBankruptcyMessage,
  foreclosureWarningMessages, getForeclosureWarningMessage,
  loanInputErrorMessages, getLoanInputErrorMessage,
  loanNoFunctionSelectedMessages, getLoanNoFunctionSelectedMessage,
  loanInsufficientRepaymentMessages, getLoanInsufficientRepaymentMessage
};
