<script lang="ts">
  import { tick } from 'svelte'
  import DiagnosticMath from './DiagnosticMath.svelte'
  import ResultSkillTree from './ResultSkillTree.svelte'
  import SkillDetails from './SkillDetails.svelte'
  import { createDiagnostic, sessionResponseCount } from './engine'
  import { bankVersion, items } from './items'
  import { describeAnswer, outcomeLabels, responseFields, resultLabels, supportLabels } from './presentation'
  import { branches, mapVersion, questionRoutes, skills } from './skills'
  import { createAttemptStore, makeExport, readAttempt } from './storage'
  import type { Attempt, Item, SkillResult } from './types'
  import './diagnostic.css'

  type View = 'diagnostic' | 'map' | 'teacher' | 'report'
  const diagnostic = createDiagnostic({ skills, items, versions: { map: mapVersion, bank: bankVersion, rules: '1.0.0' } })
  const store = createAttemptStore()
  const checkStore = createAttemptStore(undefined, 'classroom-tools.numeracy.mpm2d-skill-check')
  const labels = Object.entries(resultLabels) as [SkillResult['result'], string][]
  const bankSkills = new Set(items.map(item => item.skillId))
  const goal = 'F10'

  const savedAttempt = store.load()
  const savedCheck = checkStore.load()
  let attempt = $state.raw<Attempt | undefined>(savedAttempt)
  let skillCheck = $state.raw<Attempt | undefined>(savedCheck)
  let checkingSkill = $state(!!savedAttempt && !!savedCheck && savedCheck.status === 'active'
    && savedCheck.focus?.sourceAttemptId === savedAttempt.id && diagnostic.compatible(savedCheck))
  let imported = $state.raw<Attempt | undefined>()
  let view = $state<View>('diagnostic')
  let nickname = $state('')
  let branchId = $state('factoring')
  let selectedSkill = $state(goal)
  let filter = $state<SkillResult['result'] | 'all'>('all')
  let values = $state<string[]>([])
  let formError = $state('')
  let importMessage = $state('')
  let storageError = $state(false)
  let replaceAttempt = $state(false)
  let title: HTMLHeadingElement | undefined = $state()
  let answerForm: HTMLFormElement | undefined = $state()
  let resultTree: { inspect: (id: string, trigger?: HTMLElement) => void } | undefined = $state()

  const questionAttempt = $derived(checkingSkill ? skillCheck : attempt)
  const item = $derived(questionAttempt && diagnostic.current(questionAttempt))
  const checkResult = $derived(skillCheck?.status === 'finished' && skillCheck.focus?.sourceAttemptId === attempt?.id
    ? diagnostic.report(skillCheck).find(row => row.skill.id === skillCheck?.focus?.skillId) : undefined)
  const compatible = $derived(!attempt || diagnostic.compatible(attempt))
  const report = $derived(attempt ? diagnostic.report(attempt) : [])
  const targets = $derived(attempt && compatible ? diagnostic.practiceTargets(attempt, goal) : [])
  const reviewed = $derived(imported ?? attempt)
  const reviewReport = $derived(reviewed ? diagnostic.report(reviewed) : [])
  const activeMap = $derived(view === 'teacher' ? reviewed?.skills ?? skills : attempt?.skills ?? skills)
  const selected = $derived(activeMap.find(skill => skill.id === selectedSkill))
  const selectedBranch = $derived(branches.find(branch => branch.id === branchId))
  const section = $derived(branches.find(branch => branch.id === skills.find(skill => skill.id === item?.skillId)?.branch))
  const sessionCount = $derived(questionAttempt ? sessionResponseCount(questionAttempt) : 0)
  const skillNames = (ids: string[]) => ids.map(id => activeMap.find(skill => skill.id === id)?.name ?? id)
  const date = (iso: string) => new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(iso))

  function focusTitle() {
    void tick().then(() => title?.focus())
  }

  function navigate(next: View) {
    if (view === next) return
    view = next
    if (!activeMap.some(skill => skill.id === selectedSkill)) selectedSkill = goal
    if (next === 'map') branchId = activeMap.find(skill => skill.id === selectedSkill)?.branch ?? 'factoring'
    focusTitle()
  }

  function save(next: Attempt) {
    if (next === attempt) return
    attempt = next
    storageError = !store.save(next)
  }

  function saveSkillCheck(next: Attempt) {
    skillCheck = next
    storageError = !checkStore.save(next)
  }

  function openSkill(id: string, trigger?: HTMLElement) {
    if (!attempt) return
    const saved = skillCheck?.focus?.skillId === id && skillCheck.focus.sourceAttemptId === attempt.id
      && diagnostic.compatible(skillCheck) ? skillCheck : undefined
    const next = saved && saved.status !== 'finished'
      ? diagnostic.resume(saved)
      : diagnostic.startSkillCheck(attempt, id)
    if (!next) {
      resultTree?.inspect(id, trigger)
      return
    }
    saveSkillCheck(next)
    checkingSkill = true
    values = []
    formError = ''
    navigate('diagnostic')
  }

  function returnFromSkillCheck() {
    if (skillCheck?.status === 'active') saveSkillCheck(diagnostic.pause(skillCheck))
    checkingSkill = false
    navigate('report')
  }

  function selectSkill(id: string, target: View) {
    const skill = activeMap.find(node => node.id === id)
    if (!skill) return
    selectedSkill = id
    branchId = skill.branch
    view = target
    void tick().then(() => document.getElementById('diagnostic-skill-title')?.focus())
  }

  function begin(event: SubmitEvent) {
    event.preventDefault()
    if (attempt && !replaceAttempt) return
    save(diagnostic.start(nickname.trim()))
    nickname = ''
    replaceAttempt = false
    values = []
    formError = ''
    focusTitle()
  }

  function respond(question: Item, skip = false) {
    if (!questionAttempt || question.id !== item?.id || view !== 'diagnostic') return
    const transition = skip ? diagnostic.skip(questionAttempt, question.id) : diagnostic.submit(questionAttempt, question.id, values)
    if (transition.error) {
      formError = transition.error
      void tick().then(() => answerForm?.querySelectorAll('input')[transition.field ?? 0]?.focus())
      return
    }
    if (transition.attempt === questionAttempt) return
    if (checkingSkill) saveSkillCheck(transition.attempt)
    else save(transition.attempt)
    values = []
    formError = ''
    if (!checkingSkill && transition.attempt.status === 'finished') view = 'report'
    focusTitle()
  }

  function pause() {
    if (!attempt) return
    save(diagnostic.pause(attempt))
    focusTitle()
  }

  function resume() {
    if (!attempt || !compatible) return
    save(diagnostic.resume(attempt))
    view = attempt.status === 'finished' ? 'report' : 'diagnostic'
    focusTitle()
  }

  function finishEarly() {
    if (!attempt) return
    save(diagnostic.finish(attempt))
    values = []
    formError = ''
    navigate('report')
  }

  function restartForm() {
    replaceAttempt = true
    view = 'diagnostic'
    focusTitle()
  }

  function download(record: Attempt, results: SkillResult[]) {
    const url = URL.createObjectURL(new Blob([makeExport(record, results)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `mpm2d-cycle-4-${record.startedAt.slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function importReport(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    input.value = ''
    try {
      const record = file.size <= 2_000_000 ? readAttempt(await file.text()) : undefined
      if (!record) throw new Error('Invalid file')
      imported = record
      importMessage = 'Results loaded for this review.'
      if (!record.skills.some(skill => skill.id === selectedSkill)) selectedSkill = record.skills[0]?.id ?? goal
    } catch {
      importMessage = 'This file could not be opened. Choose a results JSON file downloaded from the diagnostic.'
    }
  }

  function whyPractise(result: SkillResult) {
    const next = activeMap.filter(skill => skill.essential.some(group => group.includes(result.skill.id)) && bankSkills.has(skill.id))
    return next.length ? `This skill prepares you for ${next.slice(0, 2).map(skill => `“${skill.name}”`).join(' and ')}.` : result.skill.description
  }
</script>

{#snippet overview()}
  <aside class="diag-overview" aria-label="Cycle 4 topics">
    <h2>Cycle 4 skill map</h2>
    <ul>
      {#each branches.filter(branch => branch.id !== 'foundations') as branch (branch.id)}
        <li>
          <button class="diag-link" onclick={() => selectSkill(skills.find(skill => skill.branch === branch.id)!.id, 'map')}>{branch.name}</button>
          <small>{branch.enabled ? 'Diagnostic available' : 'Awaiting questions'}</small>
        </li>
      {/each}
    </ul>
  </aside>
{/snippet}

{#snippet checkActions()}
  <div class="diag-actions">
    <button class="diag-primary" onclick={resume}>Resume diagnostic</button>
    <button class="diag-secondary" onclick={() => navigate('report')}>View current checklist</button>
  </div>
{/snippet}

<main class="cycle-diagnostic">
  <div class="diag-bar">
    <div class="diag-course"><strong>MPM2D</strong><span>Cycle 4</span></div>
    <nav aria-label="Diagnostic views">
      <button aria-current={view === 'diagnostic' || view === 'report' ? 'page' : undefined} onclick={() => navigate('diagnostic')}>Diagnostic</button>
      <button aria-current={view === 'map' ? 'page' : undefined} onclick={() => navigate('map')}>Skill map</button>
      <button aria-current={view === 'teacher' ? 'page' : undefined} onclick={() => navigate('teacher')}>Teacher review</button>
    </nav>
  </div>

  {#if storageError}
    <p class="diag-notice" role="status">This browser could not save your work. Download your checklist before closing the page.</p>
  {/if}

  {#if view === 'diagnostic'}
    {#if !attempt || replaceAttempt}
      <div class="diag-layout">
        <section class="diag-hero">
          <p class="diag-kicker">Grade 10 Academic Mathematics</p>
          <h1 tabindex="-1" bind:this={title}>{replaceAttempt ? 'Start a new diagnostic' : 'Cycle 4 Math Diagnostic'}</h1>
          <p class="diag-lede">Check the skills you use to solve quadratics by factoring. Your checklist will show what you’ve demonstrated and where to practise next.</p>
          <form onsubmit={begin}>
            {#if replaceAttempt}<p class="diag-notice">Starting replaces the saved attempt on this browser. Download the previous checklist first if you want to keep it.</p>{/if}
            <label for="diagnostic-nickname">Nickname <span class="diag-muted">(optional)</span></label>
            <input id="diagnostic-nickname" type="text" placeholder="Leave blank to start anonymously" bind:value={nickname} maxlength="30" autocomplete="off" />
            <div class="diag-actions">
              <button class="diag-primary" type="submit">Begin diagnostic <span aria-hidden="true">→</span></button>
              {#if replaceAttempt}<button class="diag-secondary" type="button" onclick={() => { replaceAttempt = false; navigate('report') }}>Cancel</button>{/if}
            </div>
          </form>
          <p class="diag-muted diag-fine">Work in short sessions and pause whenever you need. Progress is saved in this browser on this device.</p>
        </section>
        {@render overview()}
      </div>
    {:else if checkingSkill && skillCheck?.status === 'finished' && checkResult}
      <section class="diag-panel diag-narrow">
        <p class="diag-kicker">Skill check result</p>
        <h1 tabindex="-1" bind:this={title}>{checkResult.skill.name}</h1>
        <p><strong>{resultLabels[checkResult.result]}.</strong> {checkResult.reason}</p>
        <div class="diag-actions">
          <button class="diag-primary" onclick={returnFromSkillCheck}>Back to checklist</button>
        </div>
      </section>
    {:else if checkingSkill && skillCheck?.status === 'paused'}
      <section class="diag-panel diag-narrow">
        <h1 tabindex="-1" bind:this={title}>Skill check paused</h1>
        <div class="diag-actions">
          <button class="diag-primary" onclick={() => { if (skillCheck) { saveSkillCheck(diagnostic.resume(skillCheck)); focusTitle() } }}>Resume skill check</button>
          <button class="diag-secondary" onclick={returnFromSkillCheck}>Back to checklist</button>
        </div>
      </section>
    {:else if !checkingSkill && (!compatible || attempt.status === 'finished')}
      <section class="diag-panel diag-narrow">
        <p class="diag-kicker">Solving quadratics by factoring</p>
        <h1 tabindex="-1" bind:this={title}>{compatible ? 'Your diagnostic checklist' : 'Saved diagnostic checklist'}</h1>
        <p>{compatible ? 'Review your evidence and next practice steps.' : 'This checklist was saved with an earlier version. You can review and download it here.'}</p>
        <div class="diag-actions">
          <button class="diag-primary" onclick={() => navigate('report')}>View checklist</button>
          <button class="diag-secondary" onclick={restartForm}>Start a new diagnostic</button>
        </div>
      </section>
    {:else if !checkingSkill && attempt.status === 'paused'}
      <section class="diag-panel diag-narrow">
        <p class="diag-kicker">Solving quadratics by factoring</p>
        <h1 tabindex="-1" bind:this={title}>{attempt.pauseReason === 'session-limit' ? 'Time for a break' : 'Diagnostic paused'}</h1>
        <p>{storageError ? 'You can resume while this page is open.' : `Your progress through session ${attempt.session} is saved in this browser.`} You can review your current checklist or finish here.</p>
        {@render checkActions()}
        <button class="diag-link" onclick={finishEarly}>Finish and view checklist</button>
      </section>
    {:else if item && questionAttempt}
      {@const question = item}
      {@const answer = question.answer}
      {@const skill = skills.find(node => node.id === question.skillId)}
      <div class="diag-layout">
        <section class="diag-panel question">
          <p class="diag-kicker">{checkingSkill ? 'Skill check' : section?.name ?? 'Factoring diagnostic'} · {skill?.name}</p>
          <h1 tabindex="-1" bind:this={title}>{question.prompt}</h1>
          {#if question.math}<div class="question-math"><DiagnosticMath tex={question.math} /></div>{/if}
          {#if question.instruction}<p>{question.instruction}</p>{/if}
          {#if question.domain}<p class="diag-muted">{question.domain}</p>{/if}
          {#key question.id}
            <form bind:this={answerForm} onsubmit={(event) => { event.preventDefault(); respond(question) }} aria-describedby={formError ? 'diagnostic-answer-error' : undefined}>
              {#if answer.kind === 'choice'}
                <fieldset class="diag-options">
                  <legend>Choose one answer</legend>
                  {#each answer.options as option (option.id)}
                    <label class:chosen={values[0] === option.id}>
                      <input type="radio" name="diagnostic-option" value={option.id} bind:group={values[0]} />
                      <span>{option.text}{#if option.math} <DiagnosticMath tex={option.math} />{/if}</span>
                    </label>
                  {/each}
                </fieldset>
              {:else}
                <div class="diag-fields">
                  {#each responseFields(answer) as field, index}
                    <label>
                      <span>{field.label}{#if field.math} <DiagnosticMath tex={field.math} />{/if}</span>
                      <input type="text" autocomplete="off" spellcheck="false" maxlength="120" bind:value={values[index]} aria-describedby={field.hint ? `diagnostic-field-${index}` : undefined} />
                      {#if field.hint}<small id={`diagnostic-field-${index}`}>{field.hint}</small>{/if}
                    </label>
                  {/each}
                </div>
              {/if}
              {#if formError}<p class="diag-error" id="diagnostic-answer-error" role="alert">{formError}</p>{/if}
              <div class="diag-actions">
                <button class="diag-primary" type="submit">Submit answer</button>
                <button class="diag-secondary" type="button" onclick={() => respond(question, true)}>I’m not sure</button>
              </div>
            </form>
          {/key}
        </section>
        <aside class="diag-overview" aria-label="Session and supports">
          <h2>{checkingSkill ? 'Focused skill check' : `Session ${questionAttempt.session}`}</h2>
          {#if checkingSkill}
            <p class="diag-muted" aria-live="polite">{questionAttempt.responses.length} of up to {questionAttempt.rules.maxResponses} answered</p>
            <p>This check has its own result.</p>
          {:else}
            <label for="diagnostic-progress">{sessionCount} of up to {questionAttempt.rules.sessionLength} questions in this session</label>
            <progress id="diagnostic-progress" value={sessionCount} max={questionAttempt.rules.sessionLength}></progress>
            <p class="diag-muted" aria-live="polite">{questionAttempt.responses.filter(response => response.outcome !== 'skipped').length} answered in this attempt · {questionAttempt.responses.filter(response => response.outcome === 'skipped').length} skipped</p>
          {/if}
          <p>{supportLabels[question.support]}</p>
          <div class="diag-session-actions">
            {#if checkingSkill}
              <button class="diag-secondary" onclick={returnFromSkillCheck}>Back to checklist</button>
            {:else}
              <button class="diag-secondary" onclick={pause}>Pause</button>
              <button class="diag-link" onclick={finishEarly}>Finish early</button>
            {/if}
          </div>
        </aside>
      </div>
    {:else}
      <section class="diag-panel diag-narrow">
        <h1 tabindex="-1" bind:this={title}>Your checklist is ready</h1>
        <button class="diag-primary" onclick={finishEarly}>View checklist</button>
      </section>
    {/if}
  {:else if view === 'report' && attempt}
    <section class="diag-report">
      <div class="diag-report-head">
        <div>
          <p class="diag-kicker">MPM2D · Cycle 4 · {date(attempt.startedAt)}</p>
          <h1 tabindex="-1" bind:this={title}>{attempt.nickname ? `${attempt.nickname}’s skill checklist` : 'Your skill checklist'}</h1>
          <p>{attempt.responses.filter(response => response.outcome !== 'skipped').length} answered · {attempt.responses.filter(response => response.outcome === 'skipped').length} skipped {attempt.status === 'finished' ? '' : '· In progress'}</p>
        </div>
        <div class="diag-actions">
          {#if checkResult}
            <button class="diag-secondary" onclick={() => { checkingSkill = true; navigate('diagnostic') }}>View latest skill check</button>
          {/if}
          <button class="diag-secondary" onclick={() => window.print()}>Print checklist</button>
          <button class="diag-secondary" onclick={() => attempt && download(attempt, report)}>Download results</button>
        </div>
      </div>
      <ResultSkillTree bind:this={resultTree} {report} map={activeMap} finished={attempt.status === 'finished'} oncheck={openSkill} />
      {#if targets.length}
        <section class="diag-targets" aria-labelledby="diag-targets-title">
          <h2 id="diag-targets-title">Suggested next steps</h2>
          <div>
            {#each targets as target (target.skill.id)}
              <article>
                <button class="diag-link" onclick={event => openSkill(target.skill.id, event.currentTarget)}>{target.skill.name}</button>
                <p><strong>{target.result === 'unassessed' ? 'Check this skill' : resultLabels[target.result]}.</strong> {target.reason}</p>
                <p class="diag-muted">{whyPractise(target)}</p>
              </article>
            {/each}
          </div>
        </section>
      {/if}
      <details class="diag-screen-checklist">
        <summary>All skills checklist</summary>
        <div class="diag-checklist-head">
          <label>Show results <select bind:value={filter}>
            <option value="all">All</option>
            {#each labels as [key, label]}<option value={key}>{label}</option>{/each}
          </select></label>
        </div>
        {#each labels as [key] (key)}
          {@const matches = report.filter(row => row.result === key)}
          {#if filter === 'all' || filter === key}
            <details class="diag-check-group" open={filter !== 'all' || (key !== 'unassessed' && matches.length > 0)}>
              <summary><strong class="diag-result-text" data-result={key}>{resultLabels[key]}</strong> <span>{matches.length} {matches.length === 1 ? 'skill' : 'skills'}</span></summary>
              {#if !matches.length}<p class="diag-muted">No skills with this result.</p>{/if}
              <ul>
                {#each matches as row (row.skill.id)}
                  <li>
                    <button class="diag-link" onclick={event => openSkill(row.skill.id, event.currentTarget)}>{row.skill.name}</button>
                    <small>{row.reason}</small>
                  </li>
                {/each}
              </ul>
            </details>
          {/if}
        {/each}
      </details>
      <div class="diag-print">
        <p>{attempt.rules.correctRequired} correct for Demonstrated · {attempt.rules.incorrectRequired} incorrect for Practise next · Up to {attempt.rules.maxResponses} usable responses per skill.</p>
        {#each labels as [key, label]}
          <h2>{label}</h2>
          <ul>
            {#each report.filter(row => row.result === key) as row (row.skill.id)}
              <li><strong>{row.skill.id} · {row.skill.name}</strong> — {row.reason} {row.availabilityReason}</li>
            {/each}
          </ul>
        {/each}
        {#if attempt.responses.length}
          <h2>Answer history</h2>
          <ol>
            {#each attempt.responses as response}
              <li><strong>{response.item.id} · {outcomeLabels[response.outcome]}</strong> {response.item.prompt} {response.item.math ?? ''} {response.outcome === 'skipped' ? '' : describeAnswer(response.item, response.answer)} {supportLabels[response.item.support]}</li>
            {/each}
          </ol>
        {/if}
      </div>
      {#if compatible && attempt.status !== 'finished'}
        <div class="diag-actions report-footer">
          {#if attempt.status === 'paused'}<button class="diag-primary" onclick={resume}>Resume diagnostic</button>{:else}<button class="diag-primary" onclick={() => navigate('diagnostic')}>Return to question</button>{/if}
          <button class="diag-secondary" onclick={finishEarly}>Finish diagnostic</button>
        </div>
      {:else}
        <div class="diag-actions report-footer">
          <button class="diag-secondary" onclick={restartForm}>Start a new diagnostic</button>
        </div>
      {/if}
    </section>
  {:else if view === 'map'}
    <header class="diag-page-head">
      <p class="diag-kicker">Number, algebra and applications</p>
      <h1 tabindex="-1" bind:this={title}>Cycle 4 skill map</h1>
      <p>Choose a branch and follow the skills that lead to each course goal.</p>
    </header>
    <div class="diag-map">
      <aside class="diag-overview">
        <h2>Branches</h2>
        <ul>
          {#each branches as branch (branch.id)}
            <li>
              <button class="diag-link" class:current-branch={branch.id === branchId} aria-pressed={branch.id === branchId} onclick={() => {
                branchId = branch.id
                selectedSkill = activeMap.find(skill => skill.branch === branch.id)?.id ?? ''
              }}>{branch.name}</button>
              <small>{branch.enabled ? 'Diagnostic available' : 'Awaiting questions'}</small>
            </li>
          {/each}
        </ul>
      </aside>
      <section class="diag-panel map-panel">
        <h2>{selectedBranch?.name}</h2>
        <p>{selectedBranch?.description}</p>
        <label>Explore a skill
          <select bind:value={selectedSkill}>
            {#each activeMap.filter(node => node.branch === branchId) as skill (skill.id)}
              <option value={skill.id}>{skill.id} · {skill.name}</option>
            {/each}
          </select>
        </label>
        {#if selected}
          {@const result = report.find(row => row.skill.id === selectedSkill)}
          <div class="diag-inspect">
            <h3 tabindex="-1" id="diagnostic-skill-title">{selected.name} <small>{selected.id}</small></h3>
            <SkillDetails skill={selected} map={activeMap} {result} showExample={!!result && (result.result === 'demonstrated' || result.result === 'practise' || attempt?.status === 'finished')} onselect={(id) => selectSkill(id, 'map')} />
          </div>
        {/if}
      </section>
    </div>
  {:else if view === 'teacher'}
    <header class="diag-page-head">
      <p class="diag-kicker">Prototype review</p>
      <h1 tabindex="-1" bind:this={title}>Teacher review</h1>
      <p>Inspect dependencies, question items and evidence from a local or downloaded attempt. Anyone who can open this app can access the review tools and item answers.</p>
    </header>
    <div class="diag-map">
      <aside class="diag-overview">
        <h2>Review an attempt</h2>
        <label class="diag-file">Open a results file <input type="file" accept=".json,application/json" onchange={importReport} /></label>
        <p role="status">{importMessage}</p>
        {#if imported}<button class="diag-secondary" onclick={() => { imported = undefined; importMessage = ''; selectedSkill = goal }}>Close imported file</button>{/if}
        {#if reviewed}
          <p><strong>{reviewed.nickname || (imported ? 'Imported attempt' : 'Local attempt')}</strong><br />{date(reviewed.startedAt)} · {reviewed.responses.length} recorded</p>
          <p class="diag-muted">Map {reviewed.versions.map} · Bank {reviewed.versions.bank} · Rules {reviewed.versions.rules}</p>
          <p>{reviewed.rules.correctRequired} correct to demonstrate, {reviewed.rules.incorrectRequired} incorrect to practise, up to {reviewed.rules.maxResponses} scored responses per skill.</p>
        {/if}
      </aside>
      <section class="diag-panel map-panel">
        <h2>Inspect a skill</h2>
        <select aria-label="Skill to inspect" bind:value={selectedSkill}>
          {#each branches as branch (branch.id)}
            <optgroup label={branch.name}>
              {#each activeMap.filter(node => node.branch === branch.id) as skill (skill.id)}
                <option value={skill.id}>{skill.id} · {skill.name}</option>
              {/each}
            </optgroup>
          {/each}
        </select>
        {#if selected}
          {@const result = reviewReport.find(row => row.skill.id === selectedSkill)}
          <div class="diag-inspect">
            <h3 tabindex="-1" id="diagnostic-skill-title">{selected.name} <small>{selected.id}</small></h3>
            {#if result?.blockers.length}<p>Waiting for {skillNames(result.blockers).join(', ')}.</p>{/if}
            <SkillDetails skill={selected} map={activeMap} {result} review onselect={(id) => selectSkill(id, 'teacher')} />
          </div>
        {/if}
        <details class="diag-subdetails">
          <summary>Workbook question routes ({questionRoutes.length})</summary>
          <ul class="route-list">
            {#each questionRoutes as route}
              <li>
                <strong>{route.type}</strong>
                <p>{route.sample}</p>
                <p>{route.evidence}</p>
                {#each route.startAt as id}<button class="diag-link" onclick={() => selectSkill(id, 'teacher')}>{id}</button>{' '}{/each}
              </li>
            {/each}
          </ul>
        </details>
      </section>
    </div>
  {/if}
</main>
