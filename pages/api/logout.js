import { withIronSessionApiRoute } from "iron-session";

const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "cnol-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

function logoutRoute(req, res) {
  req.session.destroy();
  res.json({ isLoggedIn: false });
}

export default withIronSessionApiRoute(logoutRoute, sessionOptions);
