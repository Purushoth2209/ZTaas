export const log = (message) => {
  const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[${istTime}] ${message}`);
};
