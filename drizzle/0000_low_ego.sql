CREATE TABLE "banking_accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banking_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "banking_accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "banking_transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banking_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" double precision NOT NULL,
	"transaction_datetime" timestamp with time zone DEFAULT NOW() NOT NULL
);
