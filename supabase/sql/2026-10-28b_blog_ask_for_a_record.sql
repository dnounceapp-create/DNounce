-- New blog post (KJ, Oct 28): how pros can ask clients for a record.
-- Safe to run more than once: if the post already exists, nothing changes.

DO $blog$
BEGIN
IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'how-to-ask-your-clients-for-a-record') THEN
INSERT INTO public.blog_posts (id, slug, title, description, content, category, read_time, published, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'how-to-ask-your-clients-for-a-record',
  'How to Ask Your Clients for a Record (and Why One Honest Record Beats Ten 5-Star Reviews)',
  'Your best proof is what real clients say about you. Here''s how to ask for it — without it feeling awkward — and why honest beats perfect.',
  $md$You did great work. Your client was happy. They said "I'll leave you a review!" — and then life happened, and they never did.

Sound familiar? Most happy clients mean to say something nice. They just need a nudge, and an easy way to do it. Here's how to ask, when to ask, and why an honest record is worth more than a wall of perfect stars.

## Why one honest record beats ten 5-star reviews

People have learned to skim past perfect ratings. A page full of 5-star reviews with no detail looks like it came from friends and family — or worse, was bought.

A record on DNounce is different:

- **It's a real story.** It says what happened, not just a number.
- **It has a real name on it.** The writer's first name and last initial show on every record.
- **You can't edit or delete it.** That's exactly why people trust it.

One detailed record from a real client — "She fit me in the day before my wedding and fixed a color another salon ruined" — does more for you than ten anonymous stars ever will.

## When to ask

Timing is everything. The best moment is right after a win, while the experience is fresh:

- Right after you finish the job and they're happy with it
- When they thank you or text you something kind
- When they refer a friend to you

If they just complimented you, you already know what they'd write. You're only asking them to say it where others can see it.

## How to ask (without it feeling awkward)

Keep it short, personal and easy to say no to. Something like:

> "I'm really glad it came out the way you wanted. If you have 3 minutes, would you share your experience on my DNounce profile? It helps people like you find me. Totally fine if not!"

That's it. No pressure, no script, no discount in exchange. Never offer money or perks for a record — it isn't honest, and people can tell.

## The easiest way: Request a Record

You don't have to send people hunting for your profile. From your dashboard, go to **Request a Record**:

1. **Add who you're asking** — their name and how you know them (client, customer, tenant…).
2. **Add their email or phone.** If they're already on DNounce, one is enough.
3. **Send it.** We email them a link to write about you. You can also copy the link and text it yourself.

It takes them about 3 minutes. They can write anything — positive, negative or somewhere in between. You won't be able to change it, and that's the point: it's their honest word.

## What if it's not all glowing?

It's okay if a record isn't perfect. A mostly-happy client who mentions one small hiccup sounds real — and real is what builds trust.

And if you ever see a record very differently, you can challenge it. That starts a 3-day debate where you both tell your side, and then the community decides who they side with. Nobody at DNounce picks a winner.

## Start with three

You don't need fifty. Start with three clients who loved working with you and send each of them a request this week. Three honest stories, with real names on them, will say more about you than any star rating.

**Ready? Open your dashboard and go to Request a Record.**$md$,
  'Tips',
  '5 min read',
  true,
  now(),
  now(),
  now()
);
END IF;
END
$blog$;

-- Check
SELECT slug, title, published, published_at FROM public.blog_posts WHERE slug = 'how-to-ask-your-clients-for-a-record';
