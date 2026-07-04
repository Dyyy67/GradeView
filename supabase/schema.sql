-- GradeView Supabase Database Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create profiles table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('teacher', 'parent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 2. Create classes table (managed by teachers)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    grade_level TEXT NOT NULL,
    section TEXT NOT NULL,
    school_year TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read classes" 
    ON public.classes FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can insert their own classes" 
    ON public.classes FOR INSERT 
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update/delete their own classes" 
    ON public.classes FOR ALL 
    USING (auth.uid() = teacher_id);

-- 3. Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    access_code TEXT UNIQUE NOT NULL, -- 8-character unique code generated on creation
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view students in their classes" 
    ON public.students FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = public.students.class_id AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can manage students in their classes" 
    ON public.students FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = public.students.class_id AND c.teacher_id = auth.uid()
        )
    );

-- 4. Create parents-students link table
CREATE TABLE IF NOT EXISTS public.parent_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (parent_id, student_id)
);

-- Enable RLS on parent_students
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read links" 
    ON public.parent_students FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "Parents can link via code if they are authenticated" 
    ON public.parent_students FOR INSERT 
    WITH CHECK (auth.uid() = parent_id);

-- Policy to allow parents to see students they are linked to
CREATE POLICY "Parents can select linked students"
    ON public.students FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.parent_students ps
            WHERE ps.student_id = public.students.id AND ps.parent_id = auth.uid()
        )
    );

-- 5. Create grades table (grades of each student)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    subject TEXT NOT NULL,
    grade_value NUMERIC NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_id, quarter, subject)
);

-- Enable RLS on grades
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage grades for their students" 
    ON public.grades FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.classes c ON s.class_id = c.id
            WHERE s.id = public.grades.student_id AND c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view grades for their children" 
    ON public.grades FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.parent_students ps
            WHERE ps.student_id = public.grades.student_id AND ps.parent_id = auth.uid()
        )
    );

-- 6. Trigger to sync profiles when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'parent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Secure function to link a student by access code (bypasses RLS read restriction safely)
CREATE OR REPLACE FUNCTION public.link_student_with_code(access_code_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_row RECORD;
BEGIN
  -- 1. Find the student by access code
  SELECT id, full_name INTO student_row 
  FROM public.students 
  WHERE access_code = UPPER(TRIM(access_code_input));

  IF student_row.id IS NULL THEN
    RAISE EXCEPTION 'Invalid Student Access Code. Please check and try again.';
  END IF;

  -- 2. Insert linkage record (auth.uid() represents the active parent user)
  INSERT INTO public.parent_students (parent_id, student_id)
  VALUES (auth.uid(), student_row.id)
  ON CONFLICT (parent_id, student_id) DO UPDATE 
  SET linked_at = NOW();

  -- 3. Return student details
  RETURN JSONB_BUILD_OBJECT(
    'id', student_row.id,
    'full_name', student_row.full_name
  );
END;
$$;
