export const userSignupFields = {
    email: (data) => data.email,
    username: (data) => data.email, // Use email as username as well
    firstName: (data) => data.firstName || null,
    lastName: (data) => data.lastName || null,
};
