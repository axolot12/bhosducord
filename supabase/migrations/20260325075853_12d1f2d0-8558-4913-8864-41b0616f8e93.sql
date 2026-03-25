
-- Create trigger for new user signup -> auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (user_id, username, display_name)
VALUES 
  ('a00f7d3f-d57c-48c5-9478-c5e8def408b7', 'Axonoob', 'Axo Noob'),
  ('63653b34-c3fe-4ae0-ada5-d02d6a2a7312', 'axobhaiya', 'Alite Axolot')
ON CONFLICT (user_id) DO NOTHING;
