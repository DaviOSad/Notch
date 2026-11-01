CREATE TABLE categories (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	user_id UUID REFERENCES auth.users(id) NOT NULL,
	name TEXT NOT NULL,
	type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
	parent_id UUID REFERENCES categories(id),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE expenses (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	user_id UUID REFERENCES auth.users(id) NOT NULL,
	category_id UUID REFERENCES categories(id) NOT NULL,
	type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
	amount DECIMAL(10, 2) NOT NULL,
	description TEXT,
	expense_date DATE NOT NULL,
	is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
	recurrence_end_date DATE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE goals (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	user_id UUID REFERENCES auth.users(id) NOT NULL,
	name TEXT NOT NULL,
	target_amount DECIMAL(10, 2) NOT NULL,
	current_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
	currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD')),
	deadline DATE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access to own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Full access to own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Full access to own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	DELETE FROM expenses WHERE user_id = auth.uid();
	DELETE FROM goals WHERE user_id = auth.uid();
	DELETE FROM categories WHERE user_id = auth.uid();
	DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_own_account() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_own_account() FROM anon;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
