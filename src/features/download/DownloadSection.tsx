import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Github,
  Globe,
  Laptop,
  Wifi,
} from 'lucide-react';
import { LumusLogo } from '../shell/components/LumusLogo';
import { useTranslation, type Language } from '../../i18n';
import './download.css';

const REPO_URL = 'https://github.com/dotfn/lumus-control';
const RELEASES_URL = `${REPO_URL}/releases`;
const RELEASE_API = 'https://api.github.com/repos/dotfn/lumus-control/releases/latest';

type Platform = 'mac' | 'win' | 'source';

const PLATFORM_IDS: Platform[] = ['mac', 'win', 'source'];

const ONE_LINER =
  'bash -c "$(curl -fsSL https://raw.githubusercontent.com/dotfn/lumus-control/main/install.sh)"';
const BREW_ONE = 'brew install --cask dotfn/tap/lumus-control';
const DOTFN_URL = 'https://dotfn.dev';

interface CommandProps {
  command: string;
  id: string;
  copied: string | null;
  copyLabel: string;
  copiedLabel: string;
  onCopy: (command: string, id: string) => void;
}

const Command: React.FC<CommandProps> = ({
  command,
  id,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
}) => (
  <div className="dl-command">
    <code>{command}</code>
    <button
      type="button"
      onClick={() => onCopy(command, id)}
      className="dl-copy"
      aria-label={copied === id ? copiedLabel : copyLabel}
    >
      {copied === id ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  </div>
);

interface StepProps {
  index: string;
  title: string;
  children: React.ReactNode;
}

const Step: React.FC<StepProps> = ({ index, title, children }) => (
  <li className="dl-step">
    <span className="dl-step__index" aria-hidden="true">
      {index}
    </span>
    <div className="dl-step__body">
      <h3 className="dl-step__title">{title}</h3>
      {children}
    </div>
  </li>
);

const scrollToTop = () => {
  document.getElementById('landing-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
};

export const DownloadSection: React.FC = () => {
  const { t, lang, setLang } = useTranslation();
  const [platform, setPlatform] = useState<Platform>('mac');
  const [tag, setTag] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('win')) setPlatform('win');
    else if (ua.includes('linux') || ua.includes('x11')) setPlatform('source');

    let cancelled = false;
    fetch(RELEASE_API)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.tag_name === 'string') {
          setTag(data.tag_name);
        }
      })
      .catch(() => {
        // Without network, download buttons fall back to the releases page.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyCommand = useCallback((command: string, id: string) => {
    const done = () => {
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 2000);
    };

    const fallback = () => {
      const area = document.createElement('textarea');
      area.value = command;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        done();
      } catch {
        // Command remains visible for manual selection.
      }
      document.body.removeChild(area);
    };

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(command).then(done).catch(fallback);
      return;
    }
    fallback();
  }, []);

  const version = tag?.replace(/^v/, '') ?? null;
  const artifact = (suffix: string) =>
    tag && version
      ? `${RELEASES_URL}/download/${tag}/Lumus.Control_${version}_${suffix}`
      : RELEASES_URL;
  const macDmgUrl = artifact('aarch64.dmg');
  const winExeUrl = artifact('x64-setup.exe');

  const selectPlatform = (next: Platform) => {
    setPlatform(next);
    document.getElementById(`download-tab-${next}`)?.focus();
  };

  const onPlatformKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = PLATFORM_IDS.indexOf(platform);
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = PLATFORM_IDS[(index + offset + PLATFORM_IDS.length) % PLATFORM_IDS.length];
    selectPlatform(next);
  };

  const primary =
    platform === 'mac'
      ? {
          href: macDmgUrl,
          label: tag ? t.download.cta.mac : t.download.cta.latest,
          icon: 'download',
        }
      : platform === 'win'
        ? {
            href: winExeUrl,
            label: tag ? t.download.cta.win : t.download.cta.latest,
            icon: 'download',
          }
        : { href: REPO_URL, label: t.download.cta.source, icon: 'github' };

  const metadata =
    platform === 'mac'
      ? [
          t.download.meta.free,
          tag ?? t.download.meta.latestVersion,
          t.download.meta.macOs,
          t.download.meta.appleSilicon,
        ]
      : platform === 'win'
        ? [
            t.download.meta.free,
            tag ?? t.download.meta.latestVersion,
            t.download.meta.winOs,
            t.download.meta.x64,
          ]
        : ['Node.js 20+', 'pnpm 9+', 'Rust'];

  const claims = [
    t.download.claims.accounts,
    t.download.claims.local,
    t.download.claims.last[platform],
  ];

  const langOptions: { id: Language; label: string }[] = [
    { id: 'es', label: 'Español' },
    { id: 'en', label: 'English' },
  ];

  return (
    <section id="download" className="dl-section">
      <div className="dl-glow" aria-hidden="true" />

      <div className="dl-inner">
        {/* 1. Single focal download block (no redundant left card or repeated metadata) */}
        <div className="dl-hero-band">
          <h2 className="dl-title">
            {t.download.titleLine1}
            <br />
            <span className="dl-title__muted">{t.download.titleLine2}</span>
          </h2>
          <p className="dl-intro">{t.download.intro}</p>

          <div
            className="dl-tabs"
            role="tablist"
            aria-label={t.download.platformsAria}
            onKeyDown={onPlatformKeyDown}
          >
            {PLATFORM_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`download-tab-${id}`}
                aria-selected={platform === id}
                aria-controls="download-panel"
                tabIndex={platform === id ? 0 : -1}
                className="dl-tab"
                onClick={() => setPlatform(id)}
              >
                {t.download.platformNames[id]}
              </button>
            ))}
          </div>

          <div className="dl-cta-group">
            <a className="dl-primary" href={primary.href} id={`btn-download-${platform}`}>
              {primary.icon === 'github' ? (
                <Github className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {primary.label}
            </a>

            <p className="dl-meta">
              {metadata.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </p>
          </div>
        </div>

        {/* 2. Single compact install / terminal details panel */}
        <div
          className="dl-panel"
          id="download-panel"
          role="tabpanel"
          aria-labelledby={`download-tab-${platform}`}
        >
          {platform === 'mac' && (
            <ol className="dl-steps">
              <Step index="01" title="Homebrew">
                <Command
                  command={BREW_ONE}
                  id="brew-hero"
                  copied={copied}
                  copyLabel={t.download.copy.copyBrew}
                  copiedLabel={t.download.copy.copied}
                  onCopy={copyCommand}
                />
              </Step>
              <Step index="02" title={t.download.steps.mac[0].title}>
                <p>{t.download.steps.mac[0].body}</p>
                <Command
                  command={ONE_LINER}
                  id="one-liner"
                  copied={copied}
                  copyLabel={t.download.copy.copy}
                  copiedLabel={t.download.copy.copied}
                  onCopy={copyCommand}
                />
              </Step>
              <Step index="03" title={t.download.steps.mac[1].title}>
                <p>{t.download.steps.mac[1].body}</p>
              </Step>
            </ol>
          )}

          {platform === 'win' && (
            <ol className="dl-steps">
              <Step index="01" title={t.download.steps.win[0].title}>
                <p>
                  {t.download.steps.win[0].bodyBefore}
                  <code className="dl-inline-code">{t.download.steps.win[0].bodyCode}</code>
                  {t.download.steps.win[0].bodyAfter}
                </p>
              </Step>
              <Step index="02" title={t.download.steps.win[1].title}>
                <p>{t.download.steps.win[1].body}</p>
              </Step>
              <Step index="03" title={t.download.steps.win[2].title}>
                <p>{t.download.steps.win[2].body}</p>
              </Step>
            </ol>
          )}

          {platform === 'source' && (
            <ol className="dl-steps">
              <Step index="01" title={t.download.steps.source[0].title}>
                <Command
                  command="git clone https://github.com/dotfn/lumus-control.git"
                  id="git-clone"
                  copied={copied}
                  copyLabel={t.download.copy.copy}
                  copiedLabel={t.download.copy.copied}
                  onCopy={copyCommand}
                />
              </Step>
              <Step index="02" title={t.download.steps.source[1].title}>
                <Command
                  command="pnpm install"
                  id="pnpm-install"
                  copied={copied}
                  copyLabel={t.download.copy.copy}
                  copiedLabel={t.download.copy.copied}
                  onCopy={copyCommand}
                />
              </Step>
              <Step index="03" title={t.download.steps.source[2].title}>
                <Command
                  command="pnpm tauri build"
                  id="tauri-build"
                  copied={copied}
                  copyLabel={t.download.copy.copy}
                  copiedLabel={t.download.copy.copied}
                  onCopy={copyCommand}
                />
              </Step>
            </ol>
          )}

          <div className="dl-panel__foot">
            {platform === 'source' ? (
              <p>
                {t.download.panelFoot.sourcePrefix}
                <code className="dl-inline-code">src-tauri/target/release/bundle</code>.
              </p>
            ) : (
              <p>
                {platform === 'mac'
                  ? t.download.panelFoot.otherMac
                  : t.download.panelFoot.otherWin}{' '}
                <button type="button" onClick={() => setPlatform('source')}>
                  {t.download.panelFoot.buildLink}
                </button>
                .
              </p>
            )}
          </div>
        </div>

        {/* 2. 3-column metrics strip (ThisDay style) */}
        <div className="dl-claims">
          {claims.map((claim) => (
            <div className="dl-claim" key={claim.title}>
              <span className="dl-claim__value">{claim.value}</span>
              <span className="dl-claim__title">{claim.title}</span>
              <p className="dl-claim__body">{claim.body}</p>
            </div>
          ))}
        </div>

        {/* 3. Bento highlights (2-up + interactive language card) */}
        <div className="dl-bento">
          <article className="dl-card">
            <div className="dl-card__icon" aria-hidden="true">
              <Wifi className="h-4 w-4" />
            </div>
            <h3 className="dl-card__title">{t.download.bento.localTitle}</h3>
            <p className="dl-card__body">{t.download.bento.localBody}</p>
            <div className="dl-card__tags">
              {t.download.bento.localTags.map((tagItem) => (
                <span className="dl-tag" key={tagItem}>
                  {tagItem}
                </span>
              ))}
            </div>
          </article>

          <article className="dl-card">
            <div className="dl-card__icon" aria-hidden="true">
              <Laptop className="h-4 w-4" />
            </div>
            <h3 className="dl-card__title">{t.download.bento.nativeTitle}</h3>
            <p className="dl-card__body">{t.download.bento.nativeBody}</p>
            <div className="dl-card__tags">
              {t.download.bento.nativeTags.map((tagItem) => (
                <span className="dl-tag" key={tagItem}>
                  {tagItem}
                </span>
              ))}
            </div>
          </article>

          <article className="dl-card dl-card--wide">
            <div className="dl-card__lang-head">
              <div className="dl-card__icon" aria-hidden="true">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <h3 className="dl-card__title">{t.download.bento.langTitle}</h3>
                <p className="dl-card__body">{t.download.bento.langBody}</p>
              </div>
            </div>
            <div className="dl-lang-pills" role="group" aria-label={t.nav.languageLabel}>
              {langOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="dl-lang-pill"
                  aria-pressed={lang === opt.id}
                  onClick={() => setLang(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </article>
        </div>

        {/* 4. Comparison table (ThisDay style) */}
        <div className="dl-compare">
          <div className="dl-section-head">
            <h3 className="dl-section-head__title">{t.download.compare.title}</h3>
            <p className="dl-section-head__body">{t.download.compare.subtitle}</p>
          </div>

          <div className="dl-table-wrap">
            <table className="dl-table">
              <thead>
                <tr>
                  <th scope="col">{t.download.compare.headers.feature}</th>
                  <th scope="col" className="is-lumus">
                    {t.download.compare.headers.lumus}
                  </th>
                  <th scope="col">{t.download.compare.headers.cloud}</th>
                  <th scope="col">{t.download.compare.headers.hub}</th>
                </tr>
              </thead>
              <tbody>
                {t.download.compare.rows.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    <td className="is-lumus">{row.lumus}</td>
                    <td>{row.cloud}</td>
                    <td>{row.hub}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Centered FAQ accordion */}
        <div className="dl-faq">
          <div className="dl-section-head">
            <h3 className="dl-section-head__title">{t.download.faq.title}</h3>
            <p className="dl-section-head__body">{t.download.faq.intro}</p>
          </div>
          <div className="dl-faq__list">
            {t.download.faq.items.map(({ q, a }) => (
              <details className="dl-q" key={q}>
                <summary className="dl-q__summary">
                  <span>{q}</span>
                  <span className="dl-q__icon" aria-hidden="true" />
                </summary>
                <p className="dl-q__answer">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* 6. Centered editorial footer */}
        <footer className="dl-footer">
          <div className="dl-footer__brand">
            <span className="dl-footer__logo" aria-hidden="true">
              <LumusLogo variant="icon" size={44} />
            </span>
            <span className="dl-footer__name">Lumus Control</span>
          </div>

          <div className="dl-footer__links">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer">
              {t.download.footer.releases}
            </a>
            <button type="button" onClick={scrollToTop}>
              {t.download.footer.backToTop}
            </button>
          </div>

          <p className="dl-footer__claims">
            {t.download.footer.openSource} · {t.download.footer.noAccounts} ·{' '}
            {t.download.footer.noCloud}
          </p>

          <div className="dl-footer__bottom">
            <div className="dl-footer__lang" role="group" aria-label={t.nav.languageLabel}>
              {langOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="dl-footer__lang-btn"
                  aria-pressed={lang === opt.id}
                  onClick={() => setLang(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <a
              className="dl-footer__dotfn"
              href={DOTFN_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t.download.footer.builtByAria}
            >
              {t.download.footer.builtBy}
              <span className="dl-mark" aria-hidden="true">
                <span className="dl-mark__dot" />
                fn
              </span>
            </a>
          </div>
        </footer>
      </div>
    </section>
  );
};
