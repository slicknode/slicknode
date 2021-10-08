module.exports = async function handler({ args: { name } }) {
  return {
    data: `Hello ${name || 'World'}`,
  };
};
