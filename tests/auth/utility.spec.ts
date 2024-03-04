import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import { hashPassword, matchPassword } from "../../utilities/auth.utitily.js";

test.group("Utilities", (group) => {
  test("'hashPassword': Successfully hashes a plain text password", async (t) => {
    const plainTextPassword = "testPassword123";
    const hashedPassword = await hashPassword(plainTextPassword);

    t.assert.isDefined(hashedPassword);
    t.assert.isString(hashedPassword);
    t.assert.notStrictEqual(hashedPassword, plainTextPassword);
  });

  test("'hashPassword': Different hashes for the same password on subsequent calls", async (t) => {
    const plainTextPassword = "testPassword123";
    const hashedPassword1 = await hashPassword(plainTextPassword);
    const hashedPassword2 = await hashPassword(plainTextPassword);

    t.assert.notEqual(
      hashedPassword1,
      hashedPassword2,
      "Hashing the same password twice should produce different results."
    );
  });

  test("'matchPassword': Matches a hashed password with its plain text equivalent", async (t) => {
    const plainTextPassword = "correctPassword";
    const hashedPassword = await hashPassword(plainTextPassword);
    const isMatch = await matchPassword(
      plainTextPassword,
      hashedPassword || ""
    );

    t.assert.isTrue(
      isMatch,
      "The function should return true for matching passwords."
    );
  });

  test("'matchPassword': Does not match a hashed password with a different plain text", async (t) => {
    const plainTextPassword = "originalPassword";
    const wrongPassword = "wrongPassword";
    const hashedPassword = await hashPassword(plainTextPassword);

    const isMatch = await matchPassword(wrongPassword, hashedPassword || "");
    t.assert.isFalse(
      isMatch,
      "The function should return false for non-matching passwords."
    );
  });
});
