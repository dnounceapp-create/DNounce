-- Blog posts live in the blog_posts table (the .mdx files in the repo are not used by the site).
-- Brings the posts in line with how DNounce works today: "challenge", "Both sides",
-- "Community vote", names always shown, results that say who most people sided with,
-- and the record always stays up.
-- Safe: every change checks that the old text is there first. If anything is
-- different from expected, it stops and changes nothing.

DO $blog$
DECLARE
  n int;
  p record;
  c text;
  pairs text[][];
  i int;
BEGIN
  -- 1) Two process posts: full rewrite (same URLs).
  UPDATE blog_posts SET
    title = 'What to Do If Someone Posts Something Unfair About You on DNounce',
    description = 'A step-by-step guide to challenging a record, sharing your side with evidence, and letting the community weigh in.',
    content = $md$# What to Do If Someone Posts Something Unfair About You on DNounce

Finding out someone wrote about you can feel like a gut punch — especially if you think it's wrong, exaggerated, or missing context. The good news: on DNounce, you always get to tell your side. Here's what to do.

## Step 1: Read the Whole Record First

When a record is written about you, we let you know, and you get a private preview for 24 hours before it goes public. Use that time to read it carefully. Note:

- What exactly is being claimed
- Whether the dates, amounts and details are right
- What evidence (if any) was included

Take a few minutes before you write anything. Calm, clear replies land better.

## Step 2: Gather Your Evidence

Pull together anything that shows your side: messages, receipts, invoices, photos, screenshots. Stick to facts, not accusations.

## Step 3: Challenge It If You Think It's Wrong

Once the record is public, you can challenge it (once per record). A challenge opens **Both sides**, where:

- You and the writer each share your side of the story
- You can both add evidence and reply to each other
- Posts can't be edited once they're shared, so everyone stays accountable

A challenge never deletes the record. It makes sure people see the full story, not just one side of it.

## Step 4: The Community Votes

When Both sides is done, the record moves to a **Community vote**. People read both stories and pick who they side with — and they have to give a short reason. Careless reasons can be flagged by others and thrown out.

## Step 5: The Results

The results show who most people sided with, by name — for example, "Most people sided with you." If the vote is even, the record says it's a tie. Either way, the record stays up, with both sides and the result right there for anyone to read.

## Step 6: Keep Building Your Track Record

One record doesn't define you. Your profile shows how all your records turned out — how many were challenged and who people sided with — so a single bad experience is seen in context.

## The Bottom Line

Unfair posts are frustrating anywhere online. On DNounce, you're never stuck with a one-sided story: you're told about it, you get to share your side, and the community weighs in.

If you haven't claimed your profile yet, do it now so you hear about new records right away.

[Search for your profile →](https://dnounce.com)$md$,
    updated_at = now()
  WHERE id = '18efb512-823f-4de8-bff6-17a1dcf2fdfc'
    AND content LIKE '%Leans disputed%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'post "what to do if someone posts something false" not as expected; nothing changed'; END IF;

  UPDATE blog_posts SET
    title = 'What Happens When a Record Is Challenged? The DNounce Process Explained',
    description = 'When someone challenges a record on DNounce, here''s what happens — Both sides, the Community vote, and how the results are shown.',
    content = $md$Most review sites have a report button. You press it, someone at the company looks at it eventually, and the review either stays or disappears.

DNounce works differently. When a record is challenged, both people get to tell their story, and the community decides who they side with. The record always stays up.

Here's exactly how it works.

## Step 1: Someone Writes a Record

Someone with a firsthand experience — a client, a tenant, a customer — writes a record on DNounce. It includes:

- What happened, in their own words
- Any photos or files that back it up
- How they know the person (client, tenant, etc.)

The writer's first name and last initial are shown on the record.

## Step 2: The Person It's About Is Told

We let the person the record is about know right away. They get a private preview for 24 hours, then the record goes public.

## Step 3: They Can Challenge It

If the person it's about thinks the record is wrong or unfair, they can challenge it once it's public. A challenge doesn't delete anything — it opens Both sides.

## Step 4: Both Sides

Both people share their side of the story. Each can post, add evidence, and reply to the other.

Posts can't be edited once they're shared. That keeps everyone accountable, and anyone reading can follow the whole conversation in order.

Both sides is open for a set time, then closes.

## Step 5: Community Vote

Next comes the Community vote. People read both stories and choose who they side with:

- The writer
- The person it's about

Every vote needs a short reason. Other people can agree or disagree with those reasons, and careless votes can be flagged and thrown out of the final count.

## Step 6: The Results

When voting closes, the record shows who most people sided with — by name. If the votes are even, it's a tie. The record, both sides, and the votes all stay visible, so anyone who looks this person up later sees the full picture.

The result doesn't erase the record. It adds context.

## Why This Matters

Disagreements between two people are almost never one-sided. The truth is more likely to come out when both sides are heard equally, in public, with the community weighing in.

It's not a perfect system — none is. But it's a far more complete picture than a star rating and a buried reply.

If you've had an experience worth sharing — as a client, tenant, or service provider — DNounce gives you a place to put it on the record.$md$,
    updated_at = now()
  WHERE id = '1eeaf60b-2a5e-424f-8d95-388665fb2122'
    AND content LIKE '%The Verdict%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'post "what happens when a review is disputed" not as expected; nothing changed'; END IF;

  -- 2) Small wording fixes in other posts.
  FOR p IN SELECT * FROM (VALUES
    ('how-to-build-a-reputation-people-can-trust-without-fake-reviews',
     '**You always get to respond.** If you disagree with a record, you can dispute it, both sides present their case, and the community decides.',
     '**You always get to respond.** If you disagree with a record, you can challenge it: you both share your side, and the community votes on who they side with.'),
    ('why-online-reviews-are-broken--and-whats-replacing-them',
     '**2. Give the subject a voice.**',
     '**2. Give the person being reviewed a voice.**'),
    ('why-online-reviews-are-broken--and-whats-replacing-them',
     'When a record is disputed, it shouldn''t be',
     'When a record is challenged, it shouldn''t be'),
    ('why-online-reviews-are-broken--and-whats-replacing-them',
     '- The subject is notified and can respond publicly',
     '- The person it''s about is told and can share their side publicly'),
    ('why-online-reviews-are-broken--and-whats-replacing-them',
     '- The final verdict is public and permanent',
     '- The result is public, and the record stays up'),
    ('your-right-to-respond-why-one-sided-reviews-hurt-everyone',
     '- Transparent dispute processes',
     '- A clear, open way to challenge a record'),
    ('landlord-reputation-how-to-screen-a-rental-property-owner',
     '- DNounce — where tenants can file records of disputes and landlords can respond publicly',
     '- DNounce — where tenants can share their experiences and landlords can share their side')
  ) AS t(slug, old_text, new_text)
  LOOP
    SELECT content INTO c FROM blog_posts WHERE slug = p.slug;
    IF c IS NULL OR position(p.old_text IN c) = 0 THEN
      RAISE EXCEPTION 'text not found in %: %; nothing changed', p.slug, left(p.old_text, 60);
    END IF;
    UPDATE blog_posts SET content = replace(content, p.old_text, p.new_text), updated_at = now() WHERE slug = p.slug;
  END LOOP;
END
$blog$;

-- Check: should return 0 rows.
SELECT slug FROM blog_posts
WHERE content ~* '(leans disputed|verdict|the subject|withholding anonymity|dispute it,)';
