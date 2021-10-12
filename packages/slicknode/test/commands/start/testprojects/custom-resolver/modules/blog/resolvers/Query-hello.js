export default (event, context) => {
  return {
    data: `Hello ${context.settings.name}`,
  };
};
