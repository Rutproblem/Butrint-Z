import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {
  addBook,
  cancelOrder,
  createDeveloperAccount,
  deleteBook,
  getDeveloperAccounts,
  getBooks,
  getOrders,
  loginDeveloper,
  logoutDeveloper,
  updateBook,
  updateOrder,
} from './services/booksApi';

const categories = ['Roman', 'Shkencë', 'Fëmijë', 'Histori'];
const orderStatuses = [
  { value: 'new', label: 'E re' },
  { value: 'processing', label: 'Në proces' },
  { value: 'completed', label: 'Përfunduar' },
];
const statusLabels = {
  new: 'E re',
  processing: 'Në proces',
  completed: 'Përfunduar',
  cancelled: 'Anuluar',
};
const COLORS = {
  paper: '#f4f3ec',
  white: '#fffefa',
  ink: '#202b26',
  green: '#315f4c',
  greenLight: '#dce8df',
  coral: '#dd795e',
  muted: '#858a81',
  line: '#e5e4dc',
};
const money = (value) => `${Number(value).toFixed(2)} €`;

export default function DeveloperConsole({ onClose }) {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [developerAccounts, setDeveloperAccounts] = useState([]);
  const [bookForm, setBookForm] = useState(null);
  const [orderForm, setOrderForm] = useState(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [confirmDeleteBookId, setConfirmDeleteBookId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadBooks = async () => {
    const loadedBooks = await getBooks();
    setBooks(loadedBooks);
  };

  const loadOrders = async (sessionToken = token) => {
    const loadedOrders = await getOrders(sessionToken);
    setOrders(loadedOrders);
  };

  const loadDeveloperAccounts = async (sessionToken = token) => {
    const accounts = await getDeveloperAccounts(sessionToken);
    setDeveloperAccounts(accounts);
  };

  const signIn = async () => {
    if (!loginUsername.trim() || !password) {
      setError('Shkruaj emrin e përdoruesit dhe fjalëkalimin.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const session = await loginDeveloper({ username: loginUsername.trim(), password });
      setToken(session.token);
      setUsername(session.username);
      setPassword('');
      setTab('books');
      try {
        setBooks(await getBooks());
        setNotice('Hyrja u krye. Sesioni skadon pas 8 orësh.');
      } catch (loadError) {
        setError(`Hyrja u krye, por katalogu nuk u ngarkua: ${loadError.message}`);
      }
    } catch (loginError) {
      setError(loginError.message || 'Hyrja dështoi.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!token) return true;
    setLoading(true);
    setError('');
    try {
      await logoutDeveloper(token);
      setToken('');
      setUsername('');
      setOrders([]);
      setBooks([]);
      setDeveloperAccounts([]);
      setBookForm(null);
      setOrderForm(null);
      setAccountFormOpen(false);
      setError('');
      return true;
    } catch (logoutError) {
      setError(logoutError.message || 'Sesioni nuk u mbyll.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const selectTab = async (selectedTab) => {
    setTab(selectedTab);
    setError('');
    setNotice('');
    if (selectedTab === 'orders' || selectedTab === 'accounts') {
      setLoading(true);
      try {
        if (selectedTab === 'orders') await loadOrders();
        else await loadDeveloperAccounts();
      } catch (loadError) {
        setError(loadError.message || 'Të dhënat nuk u ngarkuan.');
      } finally {
        setLoading(false);
      }
    }
  };

  const saveBook = async (values, image) => {
    setLoading(true);
    setError('');
    try {
      const savedBook = values.id
        ? await updateBook(values.id, values, token, image)
        : await addBook(values, token, image);
      setBooks((current) => values.id
        ? current.map((book) => (book.id === savedBook.id ? savedBook : book))
        : [savedBook, ...current]);
      setBookForm(null);
      setNotice(values.id ? 'Libri u përditësua.' : 'Libri u shtua në katalog.');
    } catch (saveError) {
      setError(saveError.message || 'Libri nuk u ruajt.');
    } finally {
      setLoading(false);
    }
  };

  const removeBook = async (book) => {
    setLoading(true);
    setError('');
    try {
      await deleteBook(book.id, token);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      setConfirmDeleteBookId(null);
      setNotice('Libri u fshi.');
    } catch (deleteError) {
      setError(deleteError.message || 'Libri nuk u fshi.');
    } finally {
      setLoading(false);
    }
  };

  const saveOrder = async (values) => {
    setLoading(true);
    setError('');
    try {
      const savedOrder = await updateOrder(orderForm.id, values, token);
      setOrders((current) => current.map((item) => (
        item.id === savedOrder.id ? savedOrder : item
      )));
      setOrderForm(null);
      setNotice(`Porosia #${orderForm.id} u përditësua.`);
      try {
        await Promise.all([loadBooks(), loadOrders()]);
      } catch (refreshError) {
        setError(`Porosia u ruajt, por rifreskimi dështoi: ${refreshError.message}`);
      }
    } catch (saveError) {
      setError(saveError.message || 'Porosia nuk u përditësua.');
    } finally {
      setLoading(false);
    }
  };

  const saveDeveloperAccount = async (values) => {
    setLoading(true);
    setError('');
    try {
      const account = await createDeveloperAccount(values, token);
      setDeveloperAccounts((current) => [...current, account].sort((a, b) => a.username.localeCompare(b.username)));
      setAccountFormOpen(false);
      setNotice(`Llogaria ${account.username} u krijua.`);
    } catch (createError) {
      setError(createError.message || 'Llogaria nuk u krijua.');
    } finally {
      setLoading(false);
    }
  };

  const cancelSelectedOrder = async (order) => {
    setLoading(true);
    setError('');
    try {
      const cancelled = await cancelOrder(order.id, token);
      setOrders((current) => current.map((item) => (
        item.id === order.id ? cancelled : item
      )));
      setConfirmCancelId(null);
      setNotice(`Porosia #${order.id} u anulua dhe stoku u kthye.`);
      try {
        await loadBooks();
      } catch (refreshError) {
        setError(`Porosia u anulua, por katalogu nuk u rifreskua: ${refreshError.message}`);
      }
    } catch (cancelError) {
      setError(cancelError.message || 'Porosia nuk u anulua.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.paper} />
      <View style={styles.header}>
        {token ? (
          <Pressable
            onPress={signOut}
            disabled={loading}
            style={[styles.headerLogoutButton, loading && styles.disabledButton]}
            accessibilityLabel="Dil nga llogaria e administratorit"
          >
            <Text style={styles.headerActionText}>Dil</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onClose} style={styles.backButton} accessibilityLabel="Kthehu te katalogu">
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.brandName}>BIBLIOTEKA</Text>
          <Text style={styles.brandSub}>PANELI I ZHVILLUESIT</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!token ? (
            <View style={styles.loginCard}>
              <Text style={styles.eyebrow}>HAPËSIRË E MBROJTUR</Text>
              <Text style={styles.title}>Hyr si zhvillues.</Text>
              <Text style={styles.copy}>Përdor llogarinë e zhvilluesit për të menaxhuar katalogun dhe porositë.</Text>
              <FormField
                label="EMRI I PËRDORUESIT"
                value={loginUsername}
                onChangeText={setLoginUsername}
                placeholder="Emri i përdoruesit"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <FormField
                label="FJALËKALIMI"
                value={password}
                onChangeText={setPassword}
                placeholder="Fjalëkalimi"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={signIn}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <ActionButton label="Hyr në panel" onPress={signIn} disabled={loading} loading={loading} />
              <Text style={styles.helper}>Llogaritë e reja krijohen nga administratorët në panel.</Text>
            </View>
          ) : bookForm !== null ? (
            <BookEditor
              book={bookForm.id ? bookForm : null}
              loading={loading}
              error={error}
              onCancel={() => { setBookForm(null); setError(''); }}
              onSubmit={saveBook}
            />
          ) : orderForm !== null ? (
            <OrderEditor
              order={orderForm}
              books={books}
              loading={loading}
              error={error}
              onCancel={() => { setOrderForm(null); setError(''); }}
              onSubmit={saveOrder}
            />
          ) : accountFormOpen ? (
            <AdminAccountEditor
              loading={loading}
              error={error}
              onCancel={() => { setAccountFormOpen(false); setError(''); }}
              onSubmit={saveDeveloperAccount}
            />
          ) : (
            <>
              <View style={styles.welcomeRow}>
                <View>
                  <Text style={styles.eyebrow}>PANELI I ZHVILLUESIT</Text>
                  <Text style={styles.title}>Përshëndetje, {username}.</Text>
                </View>
                <Pressable
                  accessibilityLabel="Rifresko"
                  disabled={loading}
                  onPress={async () => {
                    setLoading(true);
                    setError('');
                    try {
                      await Promise.all([loadBooks(), loadOrders(), loadDeveloperAccounts()]);
                    } catch (refreshError) {
                      setError(refreshError.message || 'Të dhënat nuk u rifreskuan.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={styles.refreshButton}
                >
                  <Text style={styles.refreshText}>↻</Text>
                </Pressable>
              </View>
              <View style={styles.tabs}>
                <TabButton label={`Libra (${books.length})`} active={tab === 'books'} onPress={() => selectTab('books')} />
                <TabButton label={`Porosi (${orders.length})`} active={tab === 'orders'} onPress={() => selectTab('orders')} />
                <TabButton label={`Adminë (${developerAccounts.length})`} active={tab === 'accounts'} onPress={() => selectTab('accounts')} />
              </View>

              {tab === 'books' ? (
                <>
                  <ActionButton label="＋  Shto libër" onPress={() => { setError(''); setBookForm({}); }} />
                  {loading && books.length === 0 ? <ActivityIndicator color={COLORS.green} style={styles.loader} /> : null}
                  {books.map((book) => (
                    <View key={book.id} style={styles.itemCard}>
                      <View style={styles.itemCopy}>
                        <Text style={styles.itemTitle}>{book.title}</Text>
                        <Text style={styles.itemMeta}>{book.author} · {book.category}</Text>
                        <Text style={styles.itemMeta}>{money(book.price)} · {book.stock} në stok</Text>
                      </View>
                      {confirmDeleteBookId === book.id ? (
                        <View style={styles.confirmBox}>
                          <Text style={styles.confirmText}>Fshi librin nga katalogu?</Text>
                          <View style={styles.itemActions}>
                            <SmallButton label="Mos e fshi" onPress={() => setConfirmDeleteBookId(null)} />
                            <SmallButton label="Konfirmo fshirjen" destructive onPress={() => removeBook(book)} />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.itemActions}>
                          <SmallButton label="Edito" onPress={() => { setError(''); setBookForm(book); }} />
                          <SmallButton label="Fshi" destructive onPress={() => setConfirmDeleteBookId(book.id)} />
                        </View>
                      )}
                    </View>
                  ))}
                </>
              ) : tab === 'orders' ? (
                <>
                  <Text style={styles.copy}>Porositë e përfunduara dhe të anuluara mbeten vetëm për lexim.</Text>
                  {loading && orders.length === 0 ? <ActivityIndicator color={COLORS.green} style={styles.loader} /> : null}
                  {orders.length === 0 && !loading ? (
                    <View style={styles.emptyState}><Text style={styles.itemMeta}>Nuk ka porosi për t'u shfaqur.</Text></View>
                  ) : null}
                  {orders.map((order) => {
                    const canManage = order.status === 'new' || order.status === 'processing';
                    return (
                      <View key={order.id} style={styles.itemCard}>
                        <View style={styles.orderHeading}>
                          <Text style={styles.itemTitle}>Porosia #{order.id}</Text>
                          <Text style={[styles.status, order.status === 'cancelled' && styles.cancelledStatus]}>
                            {statusLabels[order.status] || order.status}
                          </Text>
                        </View>
                        <Text style={styles.itemMeta}>{order.customer_name} · {order.email}</Text>
                        <Text style={styles.itemMeta}>{order.phone} · {order.address}</Text>
                        <Text style={styles.itemMeta}>
                          {order.book_title || 'Libër i hequr'} · {order.quantity} copë · {money(order.total)}
                        </Text>
                        <Text style={styles.itemMeta}>{String(order.created_at || '').slice(0, 16)}</Text>
                        {canManage && confirmCancelId === order.id ? (
                          <View style={styles.confirmBox}>
                            <Text style={styles.confirmText}>Anulimi e ruan porosinë dhe kthen kopjet në stok.</Text>
                            <View style={styles.itemActions}>
                              <SmallButton label="Mos e anulo" onPress={() => setConfirmCancelId(null)} />
                              <SmallButton label="Konfirmo anulimin" destructive onPress={() => cancelSelectedOrder(order)} />
                            </View>
                          </View>
                        ) : canManage ? (
                          <View style={styles.itemActions}>
                            <SmallButton label="Edito porosinë" onPress={() => { setError(''); setOrderForm(order); }} />
                            <SmallButton label="Anulo porosinë" destructive onPress={() => setConfirmCancelId(order.id)} />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </>
              ) : (
                <>
                  <Text style={styles.copy}>Çdo llogari ka të njëjtat leje administrimi. Vendos një fjalëkalim fillestar prej të paktën 12 karakteresh dhe jepja punonjësit në mënyrë të sigurt.</Text>
                  <ActionButton
                    label="＋  Krijo llogari administratori"
                    onPress={() => { setError(''); setAccountFormOpen(true); }}
                  />
                  {loading && developerAccounts.length === 0 ? <ActivityIndicator color={COLORS.green} style={styles.loader} /> : null}
                  {developerAccounts.map((account) => (
                    <View key={account.id} style={styles.itemCard}>
                      <Text style={styles.itemTitle}>{account.username}</Text>
                      <Text style={styles.itemMeta}>Llogari administratori · krijuar {String(account.created_at || '').slice(0, 16)}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}
          {!!token && !!error && bookForm === null && orderForm === null && !accountFormOpen ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BookEditor({ book, loading, error, onCancel, onSubmit }) {
  const [title, setTitle] = useState(book?.title || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [category, setCategory] = useState(book?.category || categories[0]);
  const [price, setPrice] = useState(book ? String(book.price) : '');
  const [stock, setStock] = useState(book ? String(book.stock) : '');
  const [description, setDescription] = useState(book?.description || '');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUri, setPreviewUri] = useState(book?.imageUrl || null);
  const [choosingImage, setChoosingImage] = useState(false);
  const [validationError, setValidationError] = useState('');

  const chooseImage = async () => {
    setValidationError('');
    setChoosingImage(true);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setValidationError('Lejo qasjen te fotot për të zgjedhur kopertinën.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [2, 3],
        quality: 0.8,
      });
      if (result.canceled) return;
      const image = result.assets?.[0];
      if (!image) {
        setValidationError('Nuk u mor imazhi i zgjedhur. Provo përsëri.');
        return;
      }
      if (image.fileSize > 4 * 1024 * 1024) {
        setValidationError('Imazhi duhet të jetë jo më i madh se 4 MB.');
        return;
      }
      setSelectedImage(image);
      setPreviewUri(image.uri);
    } catch (pickerError) {
      setValidationError(pickerError.message || 'Imazhi nuk mund të zgjidhej.');
    } finally {
      setChoosingImage(false);
    }
  };

  const submit = () => {
    if (!title.trim() || !author.trim() || !price.trim() || !stock.trim()
      || !Number.isFinite(Number(price)) || Number(price) <= 0
      || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
      setValidationError('Plotëso titullin, autorin, çmimin dhe stokun saktë.');
      return;
    }
    onSubmit({
      ...(book?.id ? { id: book.id } : {}),
      title: title.trim(),
      author: author.trim(),
      category,
      price: Number(price),
      stock: Number(stock),
      description: description.trim(),
    }, selectedImage);
  };

  return (
    <View style={styles.editor}>
      <Text style={styles.eyebrow}>{book ? 'PËRDITËSO KATALOGUN' : 'ZGJERO KATALOGUN'}</Text>
      <Text style={styles.title}>{book ? 'Edito librin' : 'Shto libër'}</Text>
      <FormField label="TITULLI" value={title} onChangeText={setTitle} placeholder="Titulli" />
      <FormField label="AUTORI" value={author} onChangeText={setAuthor} placeholder="Autori" />
      <Text style={styles.fieldLabel}>KATEGORIA</Text>
      <View style={styles.choiceRow}>
        {categories.map((item) => (
          <ChoiceButton key={item} label={item} active={category === item} onPress={() => setCategory(item)} />
        ))}
      </View>
      <View style={styles.numberFields}>
        <View style={styles.numberField}>
          <FormField label="ÇMIMI (€)" value={price} onChangeText={setPrice} placeholder="12.50" keyboardType="decimal-pad" />
        </View>
        <View style={styles.numberField}>
          <FormField label="STOKU" value={stock} onChangeText={setStock} placeholder="10" keyboardType="number-pad" />
        </View>
      </View>
      <FormField label="PËRSHKRIMI" value={description} onChangeText={setDescription} placeholder="Përshkrimi" multiline />
      <View style={styles.imageField}>
        <Text style={styles.fieldLabel}>IMAZHI I KOPERTINËS · OPSIONAL</Text>
        {!!previewUri && <Image source={{ uri: previewUri }} style={styles.imagePreview} resizeMode="cover" accessibilityLabel="Parapamje e kopertinës" />}
        <Pressable onPress={chooseImage} disabled={loading || choosingImage} style={styles.imagePickerButton}>
          {choosingImage ? (
            <ActivityIndicator color={COLORS.green} />
          ) : (
            <Text style={styles.imagePickerText}>{previewUri ? 'Zgjidh imazh tjetër' : 'Zgjidh imazh'}</Text>
          )}
        </Pressable>
        <Text style={styles.imageHint}>JPG, PNG ose WebP · maksimumi 4 MB</Text>
      </View>
      {!!validationError && <Text style={styles.error}>{validationError}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <ActionButton label={book ? 'Ruaj ndryshimet' : 'Shto në katalog'} onPress={submit} disabled={loading} loading={loading} />
      <SmallButton label="Kthehu te katalogu" onPress={onCancel} />
    </View>
  );
}

function OrderEditor({ order, books, loading, error, onCancel, onSubmit }) {
  const [customerName, setCustomerName] = useState(order.customer_name || '');
  const [email, setEmail] = useState(order.email || '');
  const [phone, setPhone] = useState(order.phone || '');
  const [address, setAddress] = useState(order.address || '');
  const [bookId, setBookId] = useState(order.book_id === null ? '' : String(order.book_id));
  const [quantity, setQuantity] = useState(String(order.quantity || 1));
  const [status, setStatus] = useState(order.status);
  const [validationError, setValidationError] = useState('');
  const selectedBook = books.find((book) => String(book.id) === bookId);
  const maxQuantity = selectedBook
    ? selectedBook.stock + (selectedBook.id === order.book_id ? order.quantity : 0)
    : 0;

  const submit = () => {
    const count = Number(quantity);
    if (!customerName.trim() || !email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())
      || !phone.trim() || !address.trim() || !bookId
      || !Number.isInteger(count) || count < 1 || count > maxQuantity) {
      setValidationError('Kontrollo të dhënat e klientit, librin, sasinë dhe stokun.');
      return;
    }
    onSubmit({
      customer_name: customerName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      book_id: Number(bookId),
      quantity: count,
      status,
    });
  };

  return (
    <View style={styles.editor}>
      <Text style={styles.eyebrow}>POROSIA #{order.id}</Text>
      <Text style={styles.title}>Edito porosinë</Text>
      <FormField label="EMRI I KLIENTIT" value={customerName} onChangeText={setCustomerName} placeholder="Emri dhe mbiemri" />
      <FormField label="EMAIL" value={email} onChangeText={setEmail} placeholder="emri@shembull.com" keyboardType="email-address" autoCapitalize="none" />
      <FormField label="TELEFONI" value={phone} onChangeText={setPhone} placeholder="Telefoni" keyboardType="phone-pad" />
      <FormField label="ADRESA" value={address} onChangeText={setAddress} placeholder="Adresa" />
      <Text style={styles.fieldLabel}>LIBRI</Text>
      {books.map((book) => (
        <Pressable
          key={book.id}
          onPress={() => setBookId(String(book.id))}
          style={[styles.bookChoice, String(book.id) === bookId && styles.bookChoiceActive]}
        >
          <Text style={styles.bookChoiceTitle}>{book.title}</Text>
          <Text style={styles.itemMeta}>{book.stock} në stok · {money(book.price)}</Text>
        </Pressable>
      ))}
      <FormField label={`SASIA${selectedBook ? ` · MAKSIMUMI ${maxQuantity}` : ''}`} value={quantity} onChangeText={setQuantity} placeholder="Sasia" keyboardType="number-pad" />
      <Text style={styles.fieldLabel}>STATUSI</Text>
      <View style={styles.choiceRow}>
        {orderStatuses.map((item) => (
          <ChoiceButton key={item.value} label={item.label} active={status === item.value} onPress={() => setStatus(item.value)} />
        ))}
      </View>
      {!!validationError && <Text style={styles.error}>{validationError}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <ActionButton label="Ruaj porosinë" onPress={submit} disabled={loading} loading={loading} />
      <SmallButton label="Kthehu te porositë" onPress={onCancel} />
    </View>
  );
}

function AdminAccountEditor({ loading, error, onCancel, onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const passwordValid = password.length >= 12;
  const passwordFeedback = !password
    ? 'Kërkohen të paktën 12 karaktere.'
    : passwordValid
      ? 'Fjalëkalimi është i vlefshëm.'
      : `Edhe ${12 - password.length} karaktere për t'u bërë i vlefshëm.`;
  const confirmationFeedback = !confirmPassword
    ? ''
    : password === confirmPassword
      ? 'Fjalëkalimet përputhen.'
      : 'Fjalëkalimet nuk përputhen.';

  const submit = () => {
    if (!/^[a-zA-Z0-9_.-]{3,80}$/.test(username.trim())) {
      setValidationError('Emri duhet të ketë 3-80 karaktere: shkronja, numra, pikë, vijë ose nënvizë.');
      return;
    }
    if (!passwordValid) {
      setValidationError('Fjalëkalimi duhet të ketë të paktën 12 karaktere.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Fjalëkalimet nuk përputhen.');
      return;
    }
    onSubmit({ username: username.trim(), password });
  };

  return (
    <View style={styles.editor}>
      <Text style={styles.eyebrow}>LLOGARI E RE</Text>
      <Text style={styles.title}>Shto administrator.</Text>
      <Text style={styles.copy}>Kjo llogari do të ketë të njëjtat leje administrimi si llogaria jote.</Text>
      <FormField
        label="EMRI I PËRDORUESIT"
        value={username}
        onChangeText={(value) => { setUsername(value); setValidationError(''); }}
        placeholder="p.sh. emri.mbiemri"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FormField
        label="FJALËKALIMI FILLESTAR (TË PAKTËN 12 KARAKTERE)"
        value={password}
        onChangeText={(value) => { setPassword(value); setValidationError(''); }}
        placeholder="Fjalëkalim i sigurt"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text
        accessibilityLiveRegion="polite"
        style={[
          styles.passwordFeedback,
          !password ? styles.passwordFeedbackNeutral : passwordValid ? styles.passwordFeedbackValid : styles.passwordFeedbackInvalid,
        ]}
      >
        {passwordFeedback}
      </Text>
      <FormField
        label="KONFIRMO FJALËKALIMIN"
        value={confirmPassword}
        onChangeText={(value) => { setConfirmPassword(value); setValidationError(''); }}
        placeholder="Shkruaje përsëri"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!!confirmationFeedback && (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.passwordFeedback,
            password === confirmPassword ? styles.passwordFeedbackValid : styles.passwordFeedbackInvalid,
          ]}
        >
          {confirmationFeedback}
        </Text>
      )}
      {!!validationError && <Text style={styles.error}>{validationError}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <ActionButton label="Krijo llogarinë" onPress={submit} disabled={loading} loading={loading} />
      <SmallButton label="Kthehu te llogaritë" onPress={onCancel} />
    </View>
  );
}

function FormField({ label, multiline = false, ...inputProps }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        placeholderTextColor={COLORS.muted}
        style={[styles.fieldInput, multiline && styles.multilineInput]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function ActionButton({ label, onPress, disabled = false, loading = false }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.primaryButton, disabled && styles.disabledButton]}>
      {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

function SmallButton({ label, onPress, destructive = false }) {
  return (
    <Pressable onPress={onPress} style={[styles.smallButton, destructive && styles.destructiveButton]}>
      <Text style={[styles.smallButtonText, destructive && styles.destructiveText]}>{label}</Text>
    </Pressable>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.activeTab]}>
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </Pressable>
  );
}

function ChoiceButton({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active && styles.activeChoice]}>
      <Text style={[styles.choiceText, active && styles.activeChoiceText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.paper },
  header: { minHeight: 70, marginHorizontal: 22, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.green, fontSize: 29, lineHeight: 31, marginTop: -3 },
  headerCopy: { flex: 1, marginLeft: 10 },
  brandName: { color: COLORS.ink, fontSize: 11, fontWeight: '800' },
  brandSub: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  headerLogoutButton: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: COLORS.white, borderRadius: 4 },
  headerActionText: { color: COLORS.coral, fontWeight: '700', fontSize: 12 },
  body: { flex: 1 },
  content: { padding: 22, paddingBottom: 36 },
  loginCard: { marginTop: 32, padding: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6 },
  eyebrow: { color: COLORS.coral, fontSize: 9, fontWeight: '800' },
  title: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 28, lineHeight: 34, marginTop: 7, marginBottom: 12 },
  copy: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginBottom: 18 },
  helper: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 13 },
  formField: { marginBottom: 13 },
  fieldLabel: { fontSize: 8, color: COLORS.muted, fontWeight: '800', marginBottom: 6 },
  fieldInput: { backgroundColor: COLORS.white, minHeight: 43, borderWidth: 1, borderColor: COLORS.line, borderRadius: 4, paddingHorizontal: 11, color: COLORS.ink, fontSize: 13 },
  multilineInput: { minHeight: 74, paddingTop: 10 },
  primaryButton: { minHeight: 45, backgroundColor: COLORS.green, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 4, marginTop: 5, marginBottom: 10 },
  primaryButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  disabledButton: { opacity: 0.6 },
  error: { color: COLORS.coral, fontSize: 11, lineHeight: 16, marginVertical: 8 },
  passwordFeedback: { fontSize: 10, lineHeight: 14, marginTop: -8, marginBottom: 10 },
  passwordFeedbackNeutral: { color: COLORS.muted },
  passwordFeedbackValid: { color: COLORS.green },
  passwordFeedbackInvalid: { color: COLORS.coral },
  notice: { color: COLORS.green, fontSize: 11, marginVertical: 10 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 },
  refreshButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: COLORS.green, fontSize: 24 },
  tabs: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  tab: { paddingVertical: 11, paddingHorizontal: 14, marginRight: 7 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.green },
  tabText: { color: COLORS.muted, fontSize: 12 },
  activeTabText: { color: COLORS.green, fontWeight: '700' },
  itemCard: { padding: 13, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5, marginTop: 10 },
  itemCopy: { flex: 1 },
  itemTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 16 },
  itemMeta: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  itemActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 4, backgroundColor: COLORS.greenLight },
  smallButtonText: { color: COLORS.green, fontSize: 10, fontWeight: '700' },
  destructiveButton: { backgroundColor: '#f5e1dc' },
  destructiveText: { color: COLORS.coral },
  orderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { color: COLORS.green, backgroundColor: COLORS.greenLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 9, fontWeight: '700' },
  cancelledStatus: { color: COLORS.muted, backgroundColor: COLORS.line },
  confirmBox: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line },
  confirmText: { color: COLORS.ink, fontSize: 10, lineHeight: 15 },
  emptyState: { padding: 20, alignItems: 'center', backgroundColor: COLORS.white, marginTop: 10 },
  loader: { paddingVertical: 25 },
  editor: { padding: 17, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5 },
  imageField: { marginBottom: 13 },
  imagePreview: { width: 110, height: 150, backgroundColor: COLORS.paper, marginBottom: 9, borderRadius: 4 },
  imagePickerButton: { minHeight: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.greenLight, borderRadius: 4, paddingHorizontal: 12 },
  imagePickerText: { color: COLORS.green, fontSize: 11, fontWeight: '700' },
  imageHint: { color: COLORS.muted, fontSize: 9, marginTop: 6 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 13 },
  choice: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16 },
  activeChoice: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  choiceText: { color: COLORS.muted, fontSize: 10 },
  activeChoiceText: { color: COLORS.white, fontWeight: '700' },
  numberFields: { flexDirection: 'row', gap: 11 },
  numberField: { flex: 1 },
  bookChoice: { padding: 10, marginBottom: 7, borderWidth: 1, borderColor: COLORS.line, borderRadius: 4 },
  bookChoiceActive: { borderColor: COLORS.green, backgroundColor: COLORS.greenLight },
  bookChoiceTitle: { color: COLORS.ink, fontSize: 11, fontWeight: '700' },
});
