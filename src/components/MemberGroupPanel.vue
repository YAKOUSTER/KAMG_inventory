<template>
  <section class="member-section">
    <h2 class="member-section__title">Mon groupe</h2>
    <p class="member-section__intro">
      Les membres des mêmes groupes de danse, avec leur photo et leur biographie.
    </p>

    <div v-if="groups.length">
      <div v-for="group in groups" :key="group.id" class="member-group">
        <h3 class="member-group__title">{{ group.label }}</h3>
        <p class="member-group__count">{{ group.people.length }} membre{{ group.people.length > 1 ? 's' : '' }}</p>
        <div class="member-group__people">
          <MemberPersonCard v-for="person in group.people" :key="person.id" :person="person" />
        </div>
      </div>
    </div>
    <v-alert v-else type="info" variant="tonal">
      Votre fiche n’est pas encore associée à un groupe de danse. Le conseil d’administration pourra le
      faire depuis « À ranger ».
    </v-alert>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { peopleGroupedForMember } from '@/domain/eventGroups'
import MemberPersonCard from '@/components/MemberPersonCard.vue'

const props = defineProps({
  people: { type: Array, default: () => [] },
  personIds: { type: Array, default: () => [] },
})

const groups = computed(() => peopleGroupedForMember(props.people, props.personIds))
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

.member-group {
  margin-bottom: 20px;
}

.member-group__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.member-group__count {
  margin: 0 0 10px;
  font-size: 0.82rem;
  color: rgba(44, 51, 44, 0.62);
}

.member-group__people {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
</style>
