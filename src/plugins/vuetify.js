import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { fr } from 'vuetify/locale'

export default createVuetify({
  locale: {
    locale: 'fr',
    fallback: 'fr',
    messages: { fr },
  },
  theme: {
    defaultTheme: 'kamg',
    themes: {
      kamg: {
        dark: false,
        colors: {
          primary: '#6A8C69',
          secondary: '#53736A',
          surface: '#F4F6F4',
          background: '#F4F6F4',
          kamg: '#EDEDE5',
          error: '#B85C38',
          info: '#C2C0A6',
          success: '#4CAF50',
          warning: '#A8B545',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'xl' },
    VCard: { rounded: 'xl', elevation: 0, variant: 'flat' },
    VTextField: { variant: 'underlined', density: 'comfortable' },
    VSelect: { variant: 'underlined', density: 'comfortable' },
    VAutocomplete: { variant: 'underlined', density: 'comfortable' },
    VTextarea: { variant: 'underlined', density: 'comfortable' },
    VCombobox: { variant: 'underlined', density: 'comfortable' },
    VFileInput: { variant: 'underlined', density: 'comfortable' },
    VAlert: { rounded: 'xl', variant: 'tonal' },
    VChip: { rounded: 'lg' },
    VDataTable: {
      noDataText: 'Aucune donnée',
      itemsPerPageText: 'Lignes par page',
      hover: false,
    },
    VList: { bgColor: 'transparent' },
  },
})
