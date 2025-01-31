export const extractNumber = (str) => {
  const match = str.match(/\d+/); // Match one or more digits
  return match ? parseInt(match[0], 10) : null; // Convert to a number
};