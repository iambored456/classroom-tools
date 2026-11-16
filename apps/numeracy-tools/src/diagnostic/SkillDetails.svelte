<script lang="ts">
  import { items } from './items'
  import { sourceQuickChecks } from './skills'
  import type { Skill, SkillResult } from './types'
  import DiagnosticMath from './DiagnosticMath.svelte'
  import { acceptedAnswer, describeAnswer, outcomeLabels, resultLabels, supportLabels } from './presentation'

  let { skill, map, result, review = false, showExample = false, onselect }: {
    skill: Skill
    map: Skill[]
    result?: SkillResult
    review?: boolean
    showExample?: boolean
    onselect: (id: string) => void
  } = $props()
  const bank = $derived(items.filter(item => item.skillId === skill.id))
  const example = $derived(bank.find(item => !result?.responses.some(response => response.item.id === item.id)) ?? bank[0])
  const sourceExample = $derived(sourceQuickChecks[skill.id])
  const dependants = $derived(map.filter(node => node.essential.flat().includes(skill.id) || node.supporting.includes(skill.id)))
  const name = (id: string) => map.find(node => node.id === id)?.name ?? id
  const bundledMath = (id: string, tex: string, field: 'math' | 'solutionMath' = 'math') =>
    bank.some(item => item.id === id && item[field] === tex)
</script>

{#snippet links(ids: string[], separator: string)}
  {#each ids as id, index (id)}
    {#if index > 0}<span> {separator} </span>{/if}
    <button class="diag-link" onclick={() => onselect(id)}>{name(id)}</button>
  {/each}
{/snippet}

<div class="skill-details">
  <p>{skill.description}</p>
  {#if result}
    <p><strong>{resultLabels[result.result]}.</strong> {result.reason}</p>
    {#if result.availability !== 'complete' && result.availabilityReason !== result.reason}
      <p class="diag-muted">{result.availabilityReason}</p>
    {/if}
  {:else}
    <p class="diag-muted">{bank.length ? 'Available in the diagnostic.' : 'Awaiting a question bank.'}</p>
  {/if}

  <dl class="skill-connections">
    <div>
      <dt>Essential prerequisites</dt>
      <dd>
        {#if skill.essential.length}
          <ul>
            {#each skill.essential as group}
              <li>{@render links(group, 'or')}</li>
            {/each}
          </ul>
        {:else}
          None
        {/if}
      </dd>
    </div>
    {#if skill.supporting.length}
      <div><dt>Supporting skills</dt><dd>{@render links(skill.supporting, '·')}</dd></div>
    {/if}
    {#if dependants.length}
      <div><dt>Helps with</dt><dd>{@render links(dependants.map(node => node.id), '·')}</dd></div>
    {/if}
    {#if review}
      <div><dt>Workbook prerequisites</dt><dd>{skill.sourcePrerequisites || 'None listed'}</dd></div>
      <div><dt>Dependency review</dt><dd>{skill.rationale}</dd></div>
    {/if}
  </dl>

  {#if result?.responses.length}
    <details class="diag-subdetails" open={review}>
      <summary>Recorded evidence ({result.responses.length})</summary>
      <ol class="evidence-list">
        {#each result.responses as response}
          <li>
            <strong>{outcomeLabels[response.outcome]}</strong>
            <span class="diag-muted"> · {response.item.id} · Session {response.session}</span>
            <p>{response.item.prompt}</p>
            {#if response.item.math}
              <p class="inline-math">
                {#if bundledMath(response.item.id, response.item.math)}
                  <DiagnosticMath tex={response.item.math} />
                {:else}
                  {response.item.math}
                {/if}
              </p>
            {/if}
            {#if response.outcome !== 'skipped'}<p>Response · {describeAnswer(response.item, response.answer)}</p>{/if}
            <p class="diag-muted">{supportLabels[response.item.support]}</p>
            {#if review}
              <p>Accepted · {describeAnswer(response.item, acceptedAnswer(response.item))}</p>
              <p>{response.item.solution}</p>
              {#if response.item.solutionMath}
                <p class="inline-math">
                  {#if bundledMath(response.item.id, response.item.solutionMath, 'solutionMath')}
                    <DiagnosticMath tex={response.item.solutionMath} />
                  {:else}
                    {response.item.solutionMath}
                  {/if}
                </p>
              {/if}
              {#if response.item.misconception}<p>{response.item.misconception}</p>{/if}
            {/if}
          </li>
        {/each}
      </ol>
    </details>
  {/if}

  {#if showExample && (example || sourceExample)}
    <details class="diag-subdetails">
      <summary>Worked example</summary>
      {#if example}
        <p>{example.prompt}</p>
        {#if example.math}<p class="inline-math"><DiagnosticMath tex={example.math} /></p>{/if}
        <p>{example.solution}</p>
        {#if example.solutionMath}<p class="inline-math"><DiagnosticMath tex={example.solutionMath} /></p>{/if}
      {:else if sourceExample}
        <p>{sourceExample.prompt}</p>
        <p>{sourceExample.solution}</p>
      {/if}
    </details>
  {/if}

  {#if review && bank.length}
    <div class="bank">
      <h3>Current question bank</h3>
      {#each bank as item (item.id)}
        <details class="diag-subdetails">
          <summary>{item.id} · {item.family}</summary>
          <p>{item.prompt}</p>
          {#if item.math}<p class="inline-math"><DiagnosticMath tex={item.math} /></p>{/if}
          {#if item.instruction}<p>{item.instruction}</p>{/if}
          <p>Accepted · {describeAnswer(item, acceptedAnswer(item))}</p>
          <p>{item.solution}</p>
          {#if item.solutionMath}<p class="inline-math"><DiagnosticMath tex={item.solutionMath} /></p>{/if}
          {#if item.misconception}<p>Common error · {item.misconception}</p>{/if}
          {#if item.domain}<p>Domain · {item.domain}</p>{/if}
          <p>Item prerequisites · {#if item.prerequisites?.length}{@render links(item.prerequisites, '·')}{:else}None beyond the skill prerequisites{/if}</p>
          <p class="diag-muted">{supportLabels[item.support]}</p>
        </details>
      {/each}
    </div>
  {/if}
</div>
