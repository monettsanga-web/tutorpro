# Why some parents in mainland China can't open the site — and the fixes

_Checked 2026-11-07. Homepage and /cn/ both answer 200 from outside China; the
homepage HTML is fully pre-rendered (it shows its content even with JavaScript
off); every font is self-hosted and no blocked third-party script (Google,
Facebook SDK, Trustpilot) is needed to render a page. Nothing in the website
code hides the homepage from anyone._

## The real cause

Vercel, where the site lives, has **no servers inside mainland China**. Its own
knowledge base says access from the mainland can be throttled or blocked by the
Great Firewall and is never guaranteed. Our custom domain (tutorpro.site) is
already the best-practice first step - the plain *.vercel.app address is what
gets poisoned most - but blocking can still occur per ISP and per hour.

A second, very common blocker: **links opened inside WeChat**. WeChat's built-in
browser silently refuses many foreign domains. A parent tapping the link in a
WeChat chat may see nothing while the same link works in Safari or Chrome.

## Free things to try today

1. Ask the parent to **copy the link and open it in Chrome or Safari** instead
   of tapping inside WeChat.
2. Ask them to retry on **mobile data** if Wi-Fi stalls - the three Chinese
   ISPs behave differently.
3. Send them https://www.tutorpro.site/cn/ (the Chinese page) - same host, but
   it is the page written for them.

## Fix A - Hong Kong mirror (recommended, no ICP licence needed)

A copy of the built site on a small Hong Kong server reaches the mainland
reliably, because Hong Kong traffic is not filtered the same way.

1. Rent any Hong Kong VPS (about US$5/month; DigitalOcean, Vultr, Aliyun HK...).
2. Install nginx, then copy `deploy/nginx-china.conf` to
   `/etc/nginx/conf.d/tutorpro-mirror.conf` and set the `server_name` to a
   subdomain you create, e.g. `cn-go.tutorpro.site`.
3. Add a DNS A record for that subdomain pointing at the VPS IP.
4. Run `scripts/sync-china-mirror.sh user@your-vps-ip` after each publish (or
   on a cron). It uploads the built `dist/` folder.
5. Share the subdomain link with mainland parents. The main domain stays on
   Vercel for Google, so SEO is untouched.

I can sit with you while this is set up - the config and sync script are
already in this repository.

## Fix B - mainland CDN (most reliable, needs an ICP filing)

Putting Aliyun or Tencent CDN in front of the site serves it from inside China.
It requires an ICP filing, which needs a Chinese business licence and a server
physically in the mainland - a paperwork step only you can do. Happy to prepare
everything else once you have the filing.
