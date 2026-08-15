import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'kamg',
    themes: {
      kamg: {
        dark: false,
        colors: {
          primary: '#6A8C69',
          secondary: '#53736A',
          surface: '#FFFFFF',
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
    VBtn: { rounded: 'lg' },
    VCard: { rounded: 'lg' },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable' },
    VTextarea: { variant: 'outlined', density: 'comfortable' },
    VCombobox: { variant: 'outlined', density: 'comfortable' },
  },
})
