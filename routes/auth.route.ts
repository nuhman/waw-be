import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { nanoid } from "nanoid";
import { $ref, RegisterUserInput } from "../schemas/auth.schema.js";
import { hashPassword } from "../utilities/auth.utitily.js";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options
 */

const authroutes = async (fastify: FastifyInstance, options: object) => {
  const registerSchema = {
    schema: {
      description: "Sign up a new user",
      tags: ["User", "SignUp"],
      summary: "Sign up a new user",
      body: $ref("registerUserSchema"),
      response: {
        200: $ref("registerUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  };

  fastify.post(
    "/signup",
    registerSchema,
    async (
      request: FastifyRequest<{ Body: RegisterUserInput }>,
      reply: FastifyReply
    ) => {
      const { name, email, password } = request.body;

      // check whether the email already exists in db
      const userExistCheck = await fastify.pg.query(
        "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
        [email]
      );
      if ((userExistCheck?.rowCount || 0) > 0) {
        return reply.code(409).send({
          errorCode: "AUTH-1.1",
          errorMessage: "Email already exists.",
        });
      }

      const userid = nanoid();
      const createdAt = new Date().toISOString();
      const role = ["user"];
      const hashedPassword = await hashPassword(password);

      const query = {
        text: `INSERT INTO users (userid, name, email, passwordhash, created_at, updated_at, role)
                VALUES($1, $2, $3, $4, $5, $6, $7 ) RETURNING *`,
        values: [
          userid,
          name,
          email,
          hashedPassword,
          createdAt,
          createdAt,
          role,
        ],
      };
      try {
        const { rows } = await fastify.pg.query(query);
        console.log(rows[0]);
        reply.code(201);
        return {
          userid,
          name,
          email,
          role,
        };
      } catch (err) {
        const errorMessage = "Signup process failed due to a server error.";
        fastify.log.error(errorMessage, err);
        return reply.code(500).send({
          errorCode: "AUTH-1.2",
          errorMessage,
        });
      }
    }
  );

  const userSchema = {
    schema: {
      description: "Get all users registered on the application",
      tags: ["User"],
      summary: "Get all users registered on the application",
      response: {
        200: $ref("userSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  };

  fastify.get("/users", userSchema, async (request, reply) => {
    try {
      const { rows } = await fastify.pg.query("SELECT * FROM users");
      console.log(rows);
      return rows;
    } catch (err) {
      fastify.log.error("failed to fetch all users: ", err);
    }
  });
};

export default authroutes;
