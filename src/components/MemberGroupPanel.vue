<template>
  <section class="member-section">
    <h2 class="member-section__title">Adhérents</h2>
    <p class="member-section__intro">
      Organigramme du cercle : le conseil d’administration, les responsables de groupe et les adhérents.
    </p>

    <div v-if="chart.length">
      <section v-for="section in chart" :key="section.id" class="org-section">
        <h3 class="org-section__title">
          <v-icon v-if="section.icon" size="22" class="org-section__icon">{{ section.icon }}</v-icon>
          <span>{{ section.label }}</span>
        </h3>
        <div v-for="slot in section.slots" :key="slot.id" class="org-slot">
          <h4 v-if="slot.label" class="org-slot__title">{{ slot.label }}</h4>
          <div class="org-slot__people">
            <MemberPersonCard v-for="person in slot.people" :key="person.id" :person="person" />
          </div>
        </div>
        <div v-for="child in section.children" :key="child.id" class="org-child">
          <h4 class="org-child__title">
            <v-icon v-if="child.icon" size="18" class="org-section__icon">{{ child.icon }}</v-icon>
            <span>{{ child.label }}</span>
          </h4>
          <div v-for="slot in child.slots" :key="slot.id" class="org-slot">
            <h5 class="org-slot__title">{{ slot.label }}</h5>
            <div class="org-slot__people">
              <MemberPersonCard v-for="person in slot.people" :key="person.id" :person="person" />
            </div>
          </div>
        </div>
        <div v-for="slot in section.afterSlots" :key="slot.id" class="org-slot">
          <h4 class="org-slot__title">{{ slot.label }}</h4>
          <div class="org-slot__people">
            <MemberPersonCard v-for="person in slot.people" :key="person.id" :person="person" />
          </div>
        </div>
      </section>
    </div>
    <v-alert v-else type="info" variant="tonal">
      L’organigramme se remplit en ajoutant des responsabilités sur les fiches personnes (Gestion →
      Personnes).
    </v-alert>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { orgChartFromPeople } from '@/domain/orgChart'
import MemberPersonCard from '@/components/MemberPersonCard.vue'

const props = defineProps({
  people: { type: Array, default: () => [] },
})

const chart = computed(() => orgChartFromPeople(props.people))
</script>

<style scoped>
.member-section__title {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 8px;
  color: var(--kamg-ink);
}

.member-section__intro {
  color: rgba(44, 51, 44, 0.72);
  margin: 0 0 16px;
}

.org-section {
  margin-bottom: 2.85rem;
  padding-bottom: 2.1rem;
  border-bottom: 1px solid rgba(83, 115, 106, 0.14);
}

.org-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.org-section__title,
.org-child__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.org-section__title {
  margin: 0 0 1.05rem;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--kamg-ink);
}

.org-section__icon {
  color: var(--kamg-deep);
  flex-shrink: 0;
}

.org-child {
  margin: 1.45rem 0 0.55rem;
  padding: 0.95rem 0 0.2rem 0.95rem;
  border-left: 3px solid rgba(83, 115, 106, 0.28);
}

.org-child__title {
  margin: 0 0 0.7rem;
  font-size: 0.95rem;
  font-weight: 750;
  color: var(--kamg-deep);
}

.org-slot {
  margin-bottom: 1.1rem;
}

.org-slot__title {
  margin: 0 0 0.45rem;
  font-size: 0.86rem;
  font-weight: 650;
  color: rgba(44, 51, 44, 0.72);
}

.org-slot__people {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
</style>
