export default async function (payload, context) {
  const { firstName, lastName, email } = payload.data.node;

  console.log(
    `User ${firstName} ${lastName} with email address ${email} was added.`
  );

  // Send data to external APIs (Mailchimp, Aweber, Auth-Servers etc.)
}
