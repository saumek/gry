import { z } from "zod";

const roleSchema = z.enum(["Sami", "Patryk"]);
const gameIdSchema = z.enum([
  "qa-lightning",
  "better-half",
  "mini-battleship",
  "science-quiz",
  "couple-priorities"
]);
const questionGameSchema = z.enum(["qa-lightning", "better-half"]);
const quizCategorySchema = z.enum(["matma", "geografia", "nauka", "wiedza-ogolna"]);
const clientActionIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

const actionMetaSchema = z.object({
  clientActionId: clientActionIdSchema.optional(),
  clientSentAt: z.number().int().positive().optional()
});

export const authJoinSchema = z.object({
  pin: z.string().trim().min(1),
  deviceId: z.string().trim().min(6).max(120),
  desiredRole: roleSchema.optional()
});

export const pingSchema = z.object({
  ts: z.number().optional()
});

export const gameReadySchema = z.object({
  gameId: gameIdSchema,
  ready: z.boolean()
}).merge(actionMetaSchema);

const scienceQuizStartSchema = z.object({
  gameId: z.literal("science-quiz"),
  config: z
    .object({
      category: quizCategorySchema
    })
    .optional()
}).merge(actionMetaSchema);

const defaultStartSchema = z.object({
  gameId: z.enum(["qa-lightning", "better-half", "mini-battleship", "couple-priorities"])
}).merge(actionMetaSchema);

export const gameStartSchema = z.union([scienceQuizStartSchema, defaultStartSchema]);

export const gameConfigSchema = z.object({
  gameId: z.literal("science-quiz"),
  category: quizCategorySchema
}).merge(actionMetaSchema);

const questionOptionsSchema = z
  .tuple([
    z.string().trim().min(1).max(120),
    z.string().trim().min(1).max(120),
    z.string().trim().min(1).max(120),
    z.string().trim().min(1).max(120)
  ])
  .refine((options) => new Set(options.map((entry) => entry.toLowerCase())).size === 4, {
    message: "Opcje odpowiedzi muszą być unikalne"
  });

export const questionAddSchema = z.object({
  gameId: questionGameSchema,
  text: z.string().trim().min(6).max(220),
  options: questionOptionsSchema
}).merge(actionMetaSchema);

const placementSchema = z.object({
  x: z.number().int().min(0).max(4),
  y: z.number().int().min(0).max(4),
  length: z.number().int().min(1).max(5),
  orientation: z.enum(["H", "V"])
});

const qaActionSchema = z.object({
  gameId: z.literal("qa-lightning"),
  type: z.literal("submit"),
  answerIndex: z.number().int().min(0).max(3)
}).merge(actionMetaSchema);

const betterHalfActionSchema = z.object({
  gameId: z.literal("better-half"),
  type: z.literal("submit"),
  selfAnswerIndex: z.number().int().min(0).max(3),
  guessPartnerIndex: z.number().int().min(0).max(3)
}).merge(actionMetaSchema);

const scienceQuizActionSchema = z.object({
  gameId: z.literal("science-quiz"),
  type: z.literal("submit"),
  answerIndex: z.number().int().min(0).max(3)
}).merge(actionMetaSchema);

const rankingSchema = z
  .tuple([
    z.number().int().min(0).max(3),
    z.number().int().min(0).max(3),
    z.number().int().min(0).max(3),
    z.number().int().min(0).max(3)
  ])
  .refine((ranking) => new Set(ranking).size === 4, {
    message: "Ranking musi zawierać 4 unikalne opcje"
  });

const couplePrioritiesActionSchema = z.object({
  gameId: z.literal("couple-priorities"),
  type: z.literal("submit"),
  ranking: rankingSchema,
  guessPartnerTop: z.number().int().min(0).max(3)
}).merge(actionMetaSchema);

const battleshipPlaceSchema = z.object({
  gameId: z.literal("mini-battleship"),
  type: z.literal("place_ships"),
  placements: z.array(placementSchema).min(1).max(6)
}).merge(actionMetaSchema);

const battleshipFireSchema = z.object({
  gameId: z.literal("mini-battleship"),
  type: z.literal("fire"),
  x: z.number().int().min(0).max(4),
  y: z.number().int().min(0).max(4)
}).merge(actionMetaSchema);

const gameAdvanceSchema = z.object({
  gameId: gameIdSchema,
  type: z.literal("advance")
}).merge(actionMetaSchema);

const gameRematchSchema = z.object({
  gameId: gameIdSchema,
  type: z.literal("rematch")
}).merge(actionMetaSchema);

const gameReturnLobbySchema = z.object({
  gameId: gameIdSchema,
  type: z.literal("return_lobby")
}).merge(actionMetaSchema);

const gameRequestEndSchema = z.object({
  gameId: gameIdSchema,
  type: z.literal("request_end")
}).merge(actionMetaSchema);

const gameApproveEndSchema = z.object({
  gameId: gameIdSchema,
  type: z.literal("approve_end")
}).merge(actionMetaSchema);

const gameRejectEndSchema = z.object({
  gameId: gameIdSchema,
  type: z.literal("reject_end")
}).merge(actionMetaSchema);

export const gameActionSchema = z.union([
  qaActionSchema,
  betterHalfActionSchema,
  scienceQuizActionSchema,
  couplePrioritiesActionSchema,
  battleshipPlaceSchema,
  battleshipFireSchema,
  gameAdvanceSchema,
  gameRematchSchema,
  gameReturnLobbySchema,
  gameRequestEndSchema,
  gameApproveEndSchema,
  gameRejectEndSchema
]);
