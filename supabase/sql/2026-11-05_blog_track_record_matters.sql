-- New blog post (KJ, Nov 5): why a self-employed pro's track record matters.
-- Safe to run more than once: if the post already exists, nothing changes.

DO $blog$
BEGIN
IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = 'your-track-record-matters') THEN
INSERT INTO public.blog_posts (id, slug, title, description, content, category, read_time, published, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'your-track-record-matters',
  'Your Track Record Matters: Why Word of Mouth Isn''t Enough Anymore',
  'Referrals built your business. But the next client is checking you out online before they ever call. Here''s how to make sure your good work speaks for you.',
  $md$For years, your business ran on word of mouth. A happy client told their sister, their sister told a coworker, and your phone rang. If you're a barber, a contractor, a nail tech or a realtor, you know exactly how that works.

Word of mouth still matters. But it has a limit: it only reaches people who already know someone who knows you. Everyone else, the new neighbor, the person who just moved to the area, the client of a client, is going to look you up first.

And when they do, what do they find?

## The problem: your best work is invisible

Think about everything you've done right. The job you finished ahead of schedule. The client you fit in last minute. The mistake you caught and fixed before anyone noticed.

Almost none of that is written down anywhere a stranger can see it. It lives in your clients' memories and your text messages. To someone searching for you for the first time, it might as well not exist.

Meanwhile, the people who are loudest online are often the ones with something to complain about. If the only thing a stranger can find about you is one angry post, that becomes your story, even if hundreds of happy clients would say otherwise.

## What a track record actually is

A track record isn't a star rating. It's a history: real people, describing real experiences, over time.

That's what makes it believable. A single great review could be from a friend. Ten detailed stories from different clients, written over months, are hard to fake. People can tell the difference.

On DNounce, that history is made of **records**:

- **Each record is one client's experience**, in their own words.
- **It's written by a signed-up DNounce member**, not an anonymous drive-by comment.
- **You can't edit or delete it, and neither can anyone else.** That's exactly why people trust it.

## Why "can't delete" works in your favor

At first, that last point can feel scary. What if someone writes something unfair?

Here's the thing: a profile where the pro can remove anything they don't like is worthless to the person reading it. If everything is spotless, nobody believes it. The fact that records can't be cleaned up is what gives your good ones their weight.

And you're not left without a voice. If a record gets it wrong, you can challenge it. That opens a **debate**, where you and the writer each tell your side, and then the community votes on it. Nobody at DNounce picks a winner, and nobody can pay to make a record go away.

## Your record follows your work, not your platform

If all your reviews live on one app, they belong to that app. Change how you get clients, and you start over from zero.

Your DNounce profile is yours. It's one link you can put in your Instagram bio, text to a new client before a first appointment, or add to a quote. Wherever someone finds you, they can see what the people you've worked with have said.

## How to start building yours

You don't need a hundred records. You need a few honest ones, and then you keep adding as you go.

1. **Claim or create your free profile.** If someone has already written about you, it may be waiting for you to claim.
2. **Ask three recent clients who were happy with your work.** From your dashboard, use **Request a Record** to send them a link. It takes them about 3 minutes.
3. **Share your profile link.** Put it in your bio, your email signature and your texts with new clients.
4. **Keep going.** Every time you finish a job you're proud of, ask again.

## The bottom line

Word of mouth got you here. A track record is how you reach the people who haven't heard of you yet.

Your good work deserves to be seen, not just remembered. Start writing it down, one honest record at a time.

**Ready? Create your free DNounce profile, or open your dashboard and go to Request a Record.**$md$,
  'Tips',
  '4 min read',
  true,
  now(),
  now(),
  now()
);
END IF;
END
$blog$;

-- Check
SELECT slug, title, published, published_at FROM public.blog_posts WHERE slug = 'your-track-record-matters';
