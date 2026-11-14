import { useEffect, useState } from 'react'
import { apiRequest, loadArticles, uploadArticleThumbnail } from './api.js'
import { authConfigured, supabase } from './supabase.js'

const ARTICLE_COVERS = ['/images/bamboo-flute.jpg', '/images/peacock-feather.jpg', '/images/river-dawn.jpg']
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024
const THUMBNAIL_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function fallbackCover(index = 0) {
  return ARTICLE_COVERS[index % ARTICLE_COVERS.length]
}

function Arrow() {
  return <span className="arrow" aria-hidden="true">→</span>
}

function FeatureArtwork() {
  return (
    <svg className="feature-artwork" viewBox="0 0 1000 720" role="img" aria-labelledby="art-title art-description">
      <title id="art-title">A quiet opening in a dark room</title>
      <desc id="art-description">A solitary figure faces a narrow opening filled with soft light.</desc>
      <defs>
        <linearGradient id="room" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#171717" /><stop offset="1" stopColor="#050505" />
        </linearGradient>
        <linearGradient id="opening" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b5b5b5" stopOpacity=".72" /><stop offset=".52" stopColor="#747474" stopOpacity=".46" /><stop offset="1" stopColor="#242424" stopOpacity=".2" />
        </linearGradient>
        <radialGradient id="light" cx="50%" cy="35%" r="60%">
          <stop offset="0" stopColor="#e8e8e8" stopOpacity=".18" /><stop offset="1" stopColor="#8a8a8a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#171717" /><stop offset="1" stopColor="#090909" />
        </linearGradient>
      </defs>
      <rect width="1000" height="720" fill="url(#room)" />
      <ellipse cx="540" cy="280" rx="340" ry="310" fill="url(#light)" />
      <path d="M0 0h190v720H0zM810 0h190v720H810z" fill="#080808" />
      <path d="M190 0h80v560l-80 160zM730 0h80v720l-80-160z" fill="#111" />
      <path d="M408 75h184v490H408z" fill="#080808" />
      <path d="M435 92h130v454H435z" fill="url(#opening)" />
      <path d="M435 92h130v454H435z" fill="url(#light)" />
      <path d="M0 553 435 514v206H0zM565 514l435 39v167H565z" fill="url(#floor)" />
      <path d="M0 553 435 514M565 514l435 39" stroke="#292929" strokeWidth="2" />
      <ellipse cx="504" cy="622" rx="116" ry="22" fill="#000" opacity=".66" />
      <path d="M478 487c0-33 15-54 29-54s29 21 29 54l22 113h-102z" fill="#090909" />
      <circle cx="507" cy="416" r="23" fill="#080808" />
      <path d="M476 471c6-15 19-23 31-23s25 8 31 23" fill="none" stroke="#161616" strokeWidth="8" />
      <path d="M435 91h130M434 548h132" stroke="#bdbdbd" strokeOpacity=".32" strokeWidth="2" />
      <path d="M71 655h125M804 655h124" stroke="#333" strokeWidth="1" />
    </svg>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState([])
  const [articlesLoading, setArticlesLoading] = useState(true)
  const [articleError, setArticleError] = useState('')
  const [view, setView] = useState(() => {
    const path = window.location.pathname.replace(/\/+$/, '')
    return path === '/write' ? 'writer' : path === '/contact' ? 'contact' : 'home'
  })
  const [editingId, setEditingId] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [draft, setDraft] = useState({ title: '', excerpt: '', content: '', isPremium: false, thumbnailUrl: '' })
  const [editorError, setEditorError] = useState('')
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSaving, setEditorSaving] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [contactStatus, setContactStatus] = useState(null)
  const [contactSubmitting, setContactSubmitting] = useState(false)
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckReady, setAdminCheckReady] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [writerPanel, setWriterPanel] = useState('editor')
  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsError, setContactsError] = useState('')
  const [updatingContactId, setUpdatingContactId] = useState(null)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [thumbnailError, setThumbnailError] = useState('')

  const filteredArticles = articles.filter((article) => {
    const searchableText = `${article.title} ${article.excerpt}`.toLowerCase()
    return searchableText.includes(query.trim().toLowerCase())
  })

  async function refreshArticles() {
    setArticlesLoading(true)
    setArticleError('')
    try {
      setArticles(await loadArticles())
    } catch (error) {
      setArticleError(error.message)
    } finally {
      setArticlesLoading(false)
    }
  }

  async function refreshContacts() {
    setContactsLoading(true)
    setContactsError('')
    try {
      const response = await apiRequest('/contacts')
      setContacts(response.items)
    } catch (error) {
      setContactsError(error.message)
    } finally {
      setContactsLoading(false)
    }
  }

  useEffect(() => {
    refreshArticles()
  }, [])

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return undefined
    }

    let active = true
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return
        setSession(data.session)
        setAdminCheckReady(!data.session)
        if (error) setLoginError(error.message)
        setAuthReady(true)
      })
      .catch((error) => {
        if (!active) return
        setLoginError(error.message)
        setAuthReady(true)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAdminCheckReady(!nextSession)
      setSession(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (view !== 'writer' || writerPanel !== 'inbox' || !session) return undefined
    refreshContacts()
    return undefined
  }, [view, writerPanel, session])

  useEffect(() => {
    let active = true
    if (!session) {
      setIsAdmin(false)
      setAdminCheckReady(true)
      return () => { active = false }
    }

    setAdminCheckReady(false)
    apiRequest('/admin/session')
      .then(() => { if (active) setIsAdmin(true) })
      .catch(() => { if (active) setIsAdmin(false) })
      .finally(() => { if (active) setAdminCheckReady(true) })

    return () => { active = false }
  }, [session])

  useEffect(() => {
    function syncRoute(event) {
      const path = window.location.pathname.replace(/\/+$/, '')
      const isWriter = path === '/write'
      setView(isWriter ? 'writer' : path === '/contact' ? 'contact' : 'home')
      setEditingId(isWriter ? event.state?.postId || null : null)
      setSelectedArticle(null)
      setDeleteTarget(null)
      if (isWriter) setWriterPanel('editor')
    }
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    document.title = 'Visceral'
  }, [view, editingId, writerPanel])

  useEffect(() => {
    if (!selectedArticle && !deleteTarget) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setSelectedArticle(null)
        setDeleteTarget(null)
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [selectedArticle, deleteTarget])

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function handleThumbnailUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setThumbnailError('')
    if (!THUMBNAIL_TYPES.includes(file.type)) {
      setThumbnailError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_THUMBNAIL_SIZE) {
      setThumbnailError('The image must be 5 MB or smaller.')
      return
    }

    setThumbnailUploading(true)
    try {
      const response = await uploadArticleThumbnail(file)
      updateDraft('thumbnailUrl', response.thumbnailUrl)
    } catch (error) {
      setThumbnailError(error.message)
    } finally {
      setThumbnailUploading(false)
    }
  }

  async function openWriter(article = null) {
    setSelectedArticle(null)
    setEditorError('')
    setEditorLoading(Boolean(article && article.content === undefined))
    setWriterPanel('editor')
    setEditingId(article?.id || null)
    setDraft({
      title: article?.title || '',
      excerpt: article?.excerpt || '',
      content: article?.content || '',
      isPremium: Boolean(article?.isPremium),
      thumbnailUrl: article?.thumbnailUrl || '',
    })
    setThumbnailError('')
    window.history.pushState({ truthView: 'writer', postId: article?.id || null }, '', '/write')
    setView('writer')
    window.scrollTo(0, 0)

    if (article && article.content === undefined) {
      setEditorLoading(true)
      try {
        const fullArticle = await apiRequest(`/truths/${article.id}`)
        if (fullArticle.locked || fullArticle.content === null) {
          throw new Error('This article is locked for the current account.')
        }
        setDraft({
          title: fullArticle.title,
          excerpt: fullArticle.excerpt || '',
          content: fullArticle.content || '',
          isPremium: Boolean(fullArticle.isPremium),
          thumbnailUrl: fullArticle.thumbnailUrl || '',
        })
      } catch (error) {
        setEditorError(error.message)
      } finally {
        setEditorLoading(false)
      }
    }
  }

  function returnToJournal() {
    window.history.replaceState({ truthView: 'home' }, '', '/')
    setEditingId(null)
    setView('home')
    setWriterPanel('editor')
    setEditorError('')
    window.scrollTo(0, 0)
  }

  function openContact() {
    setSelectedArticle(null)
    setDeleteTarget(null)
    setContactStatus(null)
    window.history.pushState({ truthView: 'contact' }, '', '/contact')
    setView('contact')
    window.scrollTo(0, 0)
  }

  async function sendContactMessage(event) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const body = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      subject: String(formData.get('subject') || '').trim(),
      message: String(formData.get('message') || '').trim(),
    }

    setContactSubmitting(true)
    setContactStatus(null)
    try {
      const response = await apiRequest('/contacts', { method: 'POST', body, auth: false })
      form.reset()
      setContactStatus({
        type: response.emailSent ? 'success' : 'notice',
        text: response.emailSent
          ? 'Your message has been sent. Thank you for writing.'
          : 'Your message was saved, but the email notification could not be sent. It is still in the consultation inbox.',
      })
    } catch (error) {
      setContactStatus({ type: 'error', text: error.message })
    } finally {
      setContactSubmitting(false)
    }
  }

  async function publishArticle(event) {
    event.preventDefault()
    if (thumbnailUploading) {
      setEditorError('Wait for the cover image upload to finish before publishing.')
      return
    }
    if (!draft.title.trim() || !draft.content.trim()) {
      setEditorError('Add a title and some writing before publishing.')
      return
    }

    const body = {
      title: draft.title.trim(),
      content: draft.content.trim(),
      isPremium: draft.isPremium,
      thumbnailUrl: draft.thumbnailUrl || null,
    }
    if (draft.excerpt.trim()) body.excerpt = draft.excerpt.trim()

    setEditorSaving(true)
    setEditorError('')
    try {
      await apiRequest(editingId ? `/truths/${editingId}` : '/truths', {
        method: editingId ? 'PUT' : 'POST',
        body,
      })
      await refreshArticles()
      setQuery('')
      returnToJournal()
    } catch (error) {
      setEditorError(error.message)
    } finally {
      setEditorSaving(false)
    }
  }

  async function signInOwner(event) {
    event.preventDefault()
    if (!supabase) return
    setLoginLoading(true)
    setLoginError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword })
      if (error) setLoginError(error.message)
      else setLoginPassword('')
    } catch (error) {
      setLoginError(error.message || 'Could not sign in. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  async function signOutOwner() {
    if (!supabase) return
    try {
      const { error } = await supabase.auth.signOut()
      if (error) setLoginError(error.message)
    } catch (error) {
      setLoginError(error.message || 'Could not sign out. Please try again.')
    }
    setWriterPanel('editor')
  }

  async function openArticle(article) {
    setSelectedArticle({ ...article, loading: true, error: '' })
    try {
      const detail = await apiRequest(`/truths/${article.id}`)
      setSelectedArticle({ ...detail, loading: false, error: '' })
    } catch (error) {
      setSelectedArticle({ ...article, loading: false, error: error.message })
    }
  }

  function requestDelete(article) {
    setSelectedArticle(null)
    setDeleteTarget(article)
    setDeleteError('')
  }

  async function deleteArticle() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await apiRequest(`/truths/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      await refreshArticles()
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function updateContactStatus(contactId, status) {
    setUpdatingContactId(contactId)
    setContactsError('')
    try {
      const response = await apiRequest(`/contacts/${contactId}`, {
        method: 'PATCH',
        body: { status },
      })
      setContacts((current) => current.map((contact) => contact.id === contactId ? response.contact : contact))
    } catch (error) {
      setContactsError(error.message)
    } finally {
      setUpdatingContactId(null)
    }
  }

  function formatDate(value) {
    if (!value) return 'THE TRUTH JOURNAL'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'THE TRUTH JOURNAL'
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  }

  function articleParagraphs(content) {
    return typeof content === 'string' ? content.split(/\n\s*\n/).filter(Boolean) : []
  }

  function renderOwnerLogin() {
    if (!authReady) return <p className="owner-message">Checking your owner session…</p>
    if (!authConfigured) {
      return (
        <section className="owner-login">
          <p className="writer-kicker">OWNER ACCESS</p>
          <h1>Sign-in is not configured.</h1>
          <p>Add the Supabase URL and publishable key to the frontend environment, then redeploy.</p>
        </section>
      )
    }
    return (
      <section className="owner-login">
        <p className="writer-kicker">OWNER ACCESS</p>
        <h1>Sign in to write.</h1>
        <p>Only the configured owner account can publish articles or view consultation messages.</p>
        <form className="owner-login-form" onSubmit={signInOwner}>
          <label className="contact-field"><span>Email</span><input type="email" autoComplete="username" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required /></label>
          <label className="contact-field"><span>Password</span><input type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></label>
          {loginError && <p className="form-error" role="alert">{loginError}</p>}
          <button className="publish-button" type="submit" disabled={loginLoading}>{loginLoading ? 'Signing in…' : 'Sign in'} <Arrow /></button>
        </form>
      </section>
    )
  }

  function renderEditor() {
    if (editorLoading) return <p className="owner-message">Loading article…</p>
    return (
      <>
        <p className="writer-kicker">A LIFE DEVOTED TO TRUTH</p>
        <form id="blog-editor-form" className="writer-form" onSubmit={publishArticle}>
          <input className="writer-title" maxLength={200} autoFocus required value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} placeholder="Title" aria-label="Article title" />
          <input className="writer-description" maxLength={500} value={draft.excerpt} onChange={(event) => updateDraft('excerpt', event.target.value)} placeholder="A short preview (optional)" aria-label="Article preview" />
          <div className="article-cover-control">
            <div className="article-cover-preview"><img src={draft.thumbnailUrl || fallbackCover(1)} alt="Article cover preview" /></div>
            <div className="article-cover-actions">
              <span>Article card image</span>
              <label className="article-cover-button">{thumbnailUploading ? 'Uploading...' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumbnailUpload} disabled={thumbnailUploading} /></label>
              {draft.thumbnailUrl && <button className="article-cover-remove" type="button" onClick={() => updateDraft('thumbnailUrl', '')}>Remove</button>}
              <small>JPEG, PNG, or WebP · 5 MB max</small>
              {thumbnailError && <small className="form-error" role="alert">{thumbnailError}</small>}
            </div>
          </div>
          <div className="writer-meta-row">
            <label className="premium-control"><input type="checkbox" checked={draft.isPremium} onChange={(event) => updateDraft('isPremium', event.target.checked)} /> Premium article</label>
            <span className="writer-saved-note">Articles publish immediately.</span>
          </div>
          <textarea
            className="writing-canvas"
            maxLength={100000}
            required
            value={draft.content}
            onChange={(event) => updateDraft('content', event.target.value)}
            placeholder="Tell your story from your own experience..."
            aria-label="Article content"
          />
          {editorError && <p className="form-error" role="alert">{editorError}</p>}
          <div className="writer-bottomline"><span>WRITE WHAT YOU HAVE SEEN FOR YOURSELF.</span><span>STORED IN THE TRUTH JOURNAL</span></div>
        </form>
      </>
    )
  }

  function renderInbox() {
    return (
      <>
        <div className="inbox-heading">
          <div><p className="writer-kicker">PRIVATE OWNER INBOX</p><h1>Consultation messages</h1></div>
          <button className="reader-edit" type="button" onClick={refreshContacts}>Refresh</button>
        </div>
        {contactsError && <p className="form-error" role="alert">{contactsError}</p>}
        {contactsLoading ? <p className="owner-message">Loading messages…</p> : contacts.length ? (
          <div className="message-list">
            {contacts.map((contact) => (
              <article className="message-card" key={contact.id}>
                <div className="message-card-topline">
                  <span className={'message-status status-' + contact.status}>{contact.status.replace('_', ' ')}</span>
                  <time>{formatDate(contact.createdAt)}</time>
                </div>
                <h2>{contact.subject || 'Consultation request'}</h2>
                <p className="message-sender">{contact.name} · <a href={'mailto:' + contact.email}>{contact.email}</a></p>
                <p className="message-body">{contact.message}</p>
                <div className="message-card-actions">
                  <a className="reader-edit" href={'mailto:' + contact.email + '?subject=' + encodeURIComponent('Re: ' + (contact.subject || 'Consultation request'))}>Reply by email</a>
                  <label>Status
                    <select value={contact.status} disabled={updatingContactId === contact.id} onChange={(event) => updateContactStatus(contact.id, event.target.value)}>
                      <option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option>
                    </select>
                  </label>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="empty-state">No consultation messages yet.</p>}
      </>
    )
  }

  function renderWriter() {
    if (!session) {
      return (
        <div className="site-shell writer-shell">
          <header className="writer-header">
            <button className="back-to-journal" type="button" onClick={returnToJournal}><span aria-hidden="true">←</span> The Truth</button>
            <span className="draft-status">OWNER SIGN-IN</span>
          </header>
          <main className="writer-main">{renderOwnerLogin()}</main>
        </div>
      )
    }

    if (!adminCheckReady) {
      return <div className="site-shell writer-shell"><header className="writer-header"><button className="back-to-journal" type="button" onClick={returnToJournal}><span aria-hidden="true">←</span> The Truth</button></header><main className="writer-main"><p className="owner-message">Checking owner access…</p></main></div>
    }

    if (!isAdmin) {
      return (
        <div className="site-shell writer-shell">
          <header className="writer-header"><button className="back-to-journal" type="button" onClick={returnToJournal}><span aria-hidden="true">←</span> The Truth</button></header>
          <main className="writer-main"><section className="owner-login"><p className="writer-kicker">OWNER ACCESS</p><h1>This account cannot publish.</h1><p>Sign in with the Supabase account configured as the article owner.</p><button className="signout-button" type="button" onClick={signOutOwner}>Sign out</button></section></main>
        </div>
      )
    }

    return (
      <div className="site-shell writer-shell">
        <header className="writer-header">
          <button className="back-to-journal" type="button" onClick={returnToJournal}><span aria-hidden="true">←</span> The Truth</button>
          <div className="writer-header-actions">
            <button className="inbox-toggle" type="button" onClick={() => setWriterPanel((current) => current === 'inbox' ? 'editor' : 'inbox')}>
              {writerPanel === 'inbox' ? 'Write an article' : 'Messages'}
            </button>
            {writerPanel === 'editor' && <button className="publish-button" type="submit" form="blog-editor-form" disabled={editorSaving || editorLoading}>{editorSaving ? 'Saving…' : editingId ? 'Update article' : 'Publish'} <Arrow /></button>}
            <button className="signout-button" type="button" onClick={signOutOwner}>Sign out</button>
          </div>
        </header>

        <main className="writer-main">
          {writerPanel === 'inbox' ? renderInbox() : renderEditor()}
        </main>
      </div>
    )
  }

  function renderContact() {
    return (
      <div className="site-shell contact-shell">
        <header className="writer-header">
          <button className="back-to-journal" type="button" onClick={returnToJournal}><span aria-hidden="true">←</span> The Truth</button>
          <span className="draft-status">CONTACT</span>
        </header>

        <main className="contact-main">
          <p className="writer-kicker">A SPACE FOR THOUGHTFUL EXCHANGE</p>
          <h1>Reach out.</h1>
          <p className="contact-intro">Questions, reflections, or a request for one-to-one consultation — you are welcome to write.</p>

          <div className="contact-layout">
            <form className="contact-form" onSubmit={sendContactMessage}>
              <div className="contact-field-row">
                <label className="contact-field"><span>Your name</span><input type="text" name="name" autoComplete="name" maxLength={120} placeholder="How should I address you?" required /></label>
                <label className="contact-field"><span>Your email</span><input type="email" name="email" autoComplete="email" maxLength={254} placeholder="Where can I reply?" required /></label>
              </div>
              <label className="contact-field"><span>Subject</span><input type="text" name="subject" maxLength={200} placeholder="What would you like to talk about?" /></label>
              <label className="contact-field"><span>Your message</span><textarea name="message" rows="6" maxLength={10000} placeholder="Write in your own words..." required /></label>
              <div className="contact-submit-row">
                <button className="publish-button contact-submit" type="submit" disabled={contactSubmitting}>{contactSubmitting ? 'Sending…' : 'Send message'} <Arrow /></button>
                <span>Sent privately to the journal owner</span>
              </div>
              {contactStatus && <p className={'contact-status ' + contactStatus.type} role={contactStatus.type === 'error' ? 'alert' : 'status'}>{contactStatus.text}</p>}
            </form>

            <aside className="contact-aside">
              <p className="section-kicker"><span>01</span><span>A NOTE</span></p>
              <h2>Good conversations begin with honesty.</h2>
              <p>Your message is sent to the private consultation inbox. Include an email address where I can reply.</p>
            </aside>
          </div>
          <div className="writer-bottomline contact-bottomline"><span>THANK YOU FOR WRITING.</span><span>THE TRUTH JOURNAL</span></div>
        </main>
      </div>
    )
  }

  if (view === 'writer') return renderWriter()
  if (view === 'contact') return renderContact()

  return (
    <div className="site-shell" id="home">
      <header className="site-header">
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#home">Home</a><a href="#about">About</a><a href="#articles">Articles</a>
          <a href="/contact" onClick={(event) => { event.preventDefault(); openContact() }}>Contact</a>
        </nav>
        <a className="brand-mark" href="#home" aria-label="The Truth home">✳</a>
        <div className="header-actions">
          <a className="header-note" href="#about">Read this first <Arrow /></a>
          <button className="write-button" type="button" onClick={() => openWriter()}>{isAdmin ? 'Write an article' : 'Owner sign in'} <span aria-hidden="true">+</span></button>
        </div>
      </header>

      <main>
        <section className="page-heading" aria-labelledby="page-title">
          <div className="heading-copy"><h1 id="page-title">The Truth</h1><p>Truth is what everyone is looking for. Few of us realize it.</p></div>
          <label className="search-field">
            <span className="search-icon" aria-hidden="true" /><span className="sr-only">Search articles</span>
            <input type="search" placeholder="Search articles" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </section>

        <section className="featured-article" aria-labelledby="feature-title">
          <a className="feature-image" href="#about" aria-label="Read the opening note">
            <FeatureArtwork /><span className="image-caption">A LIFE, SEEN CLEARLY <span>01</span></span>
          </a>
          <div className="feature-copy">
            <p className="article-meta">A NOTE ON LIFE <span /> THE BEGINNING</p>
            <h2 id="feature-title">What if there is a way out of all your psychological problems?</h2>
            <p>The world offers motivation, discipline, self-help, advice, tips, and tricks at every turn. Yet the problems still remain. We put out one fire after another, day after day, and begin to think that constant strain is simply normal.</p>
            <p>What if there were a genuine way through this cycle? Not another quick fix, but a clearer look at what is happening in our lives.</p>
            <a className="read-link" href="#about">Read the opening note <Arrow /></a>
          </div>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="section-kicker"><span>02</span><span>A NOTE BEFORE YOU READ</span></div>
          <div className="about-content">
            <h2 id="about-title">Take nothing here<br />on belief alone.</h2>
            <div className="about-copy">
              <p>Let your own life experience be the measure. Nothing here asks you to follow a method or perform any task. What is written matters only if it meets what you can see in your own life.</p>
              <p>This is not for everyone. It is for the serious individual willing to look closely. If these words don't resonate with you, feel free to close the tab and move on. There is no pressure to stay.</p>
              <p>There is no right or wrong, there is no good or bad, there is no should or shouldn't. There are no rules. Everything should be a side-effect of your visceral understanding.</p>
            </div>
          </div>
        </section>

        <section className="articles-section" id="articles" aria-labelledby="articles-title">
          <div className="articles-heading">
            <div><p className="section-kicker"><span>03</span><span>THE JOURNAL</span></p><h2 id="articles-title">Articles &amp; reflections</h2></div>
            <div className="articles-tools">
              <span className="article-count">{String(filteredArticles.length).padStart(2, '0')} ENTRIES</span>
              <button className="write-button secondary-write" type="button" onClick={() => openWriter()}>{isAdmin ? 'Write an article' : 'Owner sign in'} <span>+</span></button>
            </div>
          </div>
          <div className="blog-grid" aria-live="polite">
            {articlesLoading ? <p className="empty-state">Loading articles…</p> : articleError ? (
              <div className="empty-state"><p>{articleError}</p><button className="reader-edit" type="button" onClick={refreshArticles}>Try again</button></div>
            ) : filteredArticles.length ? filteredArticles.map((article, index) => (
              <article className="blog-card" key={article.id}>
                <div className="article-card-thumbnail">
                  <img src={article.thumbnailUrl || fallbackCover(index)} alt="" loading="lazy" />
                </div>
                <div className="card-topline">
                  <span className="card-category">{article.isPremium ? 'PREMIUM' : 'REFLECTION'}</span>
                  <span className="card-number">{article.isPremium ? 'LOCKED' : String(index + 1).padStart(2, '0')}</span>
                </div>
                <button className="card-open" type="button" onClick={() => openArticle(article)}>
                  <span className="card-title">{article.title}</span><span className="card-description">{article.excerpt}</span>
                </button>
                <div className="card-footer">
                  <span className="card-date">{formatDate(article.publishedAt)}</span>
                  <button className="card-read" type="button" onClick={() => openArticle(article)}>Read <Arrow /></button>
                </div>
                {isAdmin && <div className="card-management"><button type="button" onClick={() => openWriter(article)}>Edit</button><button type="button" onClick={() => requestDelete(article)}>Delete</button></div>}
              </article>
            )) : <p className="empty-state">{query ? 'No articles match that search.' : 'No articles have been published yet.'}</p>}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#home"><span>✳</span> THE TRUTH</a><span>A LIFE DEVOTED TO TRUTH.</span>
        <a href="#home">BACK TO TOP ↑</a><a href="/contact" onClick={(event) => { event.preventDefault(); openContact() }}>CONTACT</a>
      </footer>

      {selectedArticle && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedArticle(null)}>
          <article className="reader-modal" role="dialog" aria-modal="true" aria-labelledby="reader-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <p className="modal-kicker">{selectedArticle.isPremium ? 'PREMIUM ARTICLE' : 'THE JOURNAL'} <span>·</span> {formatDate(selectedArticle.publishedAt)}</p>
              <button className="modal-close" type="button" aria-label="Close article" onClick={() => setSelectedArticle(null)}>×</button>
            </div>
            <h2 id="reader-title">{selectedArticle.title}</h2><p className="reader-summary">{selectedArticle.excerpt}</p>
            {selectedArticle.loading ? <p className="owner-message">Loading article…</p> : selectedArticle.error ? <p className="form-error" role="alert">{selectedArticle.error}</p> : selectedArticle.locked ? (
              <div className="reader-lock"><span aria-hidden="true">▣</span><h3>This article is locked.</h3><p>The full article is available to premium readers.</p><button className="reader-edit" type="button" onClick={openContact}>Ask about a one-to-one consultation <Arrow /></button></div>
            ) : <div className="reader-body">{articleParagraphs(selectedArticle.content).map((paragraph, index) => <p key={selectedArticle.id + '-' + index}>{paragraph}</p>)}</div>}
            {isAdmin && !selectedArticle.locked && !selectedArticle.loading && (
              <div className="reader-actions"><button className="reader-edit" type="button" onClick={() => openWriter(selectedArticle)}>Edit article</button><button className="reader-delete" type="button" onClick={() => requestDelete(selectedArticle)}>Delete article</button></div>
            )}
          </article>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop delete-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <section className="delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" onMouseDown={(event) => event.stopPropagation()}>
            <p className="modal-kicker">REMOVE FROM THE JOURNAL</p><h2 id="delete-title">Delete this article?</h2>
            <p id="delete-description">“{deleteTarget.title}” will be removed from the publication.</p>
            {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
            <div className="delete-actions"><button className="cancel-delete" type="button" onClick={() => setDeleteTarget(null)}>Keep article</button><button className="confirm-delete" type="button" onClick={deleteArticle} disabled={deleteLoading}>{deleteLoading ? 'Deleting…' : 'Delete article'}</button></div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
