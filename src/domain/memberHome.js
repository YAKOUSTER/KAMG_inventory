import { upcomingEvents, eventIsHorsCercle } from './events.js'
import { circleNewsPages } from './content.js'
import { newMembersByCategory } from './person.js'
import { newSeasonId } from './seasons.js'

export function nextHomeEvents(events = [], { limit = 3, now } = {}) {
  return upcomingEvents(events, now).filter((event) => !eventIsHorsCercle(event)).slice(0, limit)
}

export function upcomingLibreSorties(events = [], { now } = {}) {
  return upcomingEvents(events, now).filter((event) => eventIsHorsCercle(event))
}

export function memberHomeNews(pages = [], { limit = 3 } = {}) {
  return circleNewsPages(pages, { limit })
}

export function memberHomeNewcomers(people = [], now = new Date()) {
  return {
    season: newSeasonId(now),
    groups: newMembersByCategory(people, now),
  }
}
