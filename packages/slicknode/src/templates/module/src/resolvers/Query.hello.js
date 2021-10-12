export default async function (payload, context) {
  // Call external APIs, process data etc.

  // We return the name that was provided as an input argument.
  // If we don't have an input argument, we greet the stranger...
  return {
    data: 'Hello ' + (payload.args.name || 'Stranger'),
  };
}
