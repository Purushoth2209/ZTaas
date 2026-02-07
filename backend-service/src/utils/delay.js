export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const randomDelay = () => delay(Math.floor(Math.random() * 50) + 50);
